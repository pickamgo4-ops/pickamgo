import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import prisma from "../utils/prisma";
import { authMiddleware, generateToken } from "../middleware/auth";
import {
  AuthenticatedRequest,
  successResponse,
  errorResponse,
  validateBody,
} from "../types/express";
import {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendSignInNotificationEmail,
  buildBaseHtml,
} from "../services/email";
import { validatePasswordOrThrow } from "../utils/password-validation";
import { generateVerificationCode, hashCode } from "../utils/email-verification";
import { getAppUrl } from "../utils/url";

const router = Router();

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

function parseUserAgent(userAgent?: string) {
  if (!userAgent) return { device: null, browser: null, os: null }

  let device = "desktop"
  if (/mobile|android|iphone|ipod/i.test(userAgent)) {
    device = /ipad|tablet/i.test(userAgent) ? "tablet" : "mobile"
  } else if (/ipad|tablet/i.test(userAgent)) {
    device = "tablet"
  }

  let browser: string | null = null
  if (/edg\//i.test(userAgent)) browser = "Edge"
  else if (/opr\//i.test(userAgent) || /opera/i.test(userAgent)) browser = "Opera"
  else if (/chrome/i.test(userAgent) && !/edg|opr/i.test(userAgent)) browser = "Chrome"
  else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = "Safari"
  else if (/firefox/i.test(userAgent)) browser = "Firefox"

  let os: string | null = null
  if (/windows/i.test(userAgent)) os = "Windows"
  else if (/macintosh|mac os x/i.test(userAgent)) os = "macOS"
  else if (/linux/i.test(userAgent) && !/android/i.test(userAgent)) os = "Linux"
  else if (/android/i.test(userAgent)) os = "Android"
  else if (/iphone|ipad|ipod/i.test(userAgent)) os = "iOS"

  return { device, browser, os }
}

async function createLoginHistory(userId: string, req: any, success: boolean, failureReason?: string) {
  const userAgent = req.get?.("user-agent") || req.headers?.["user-agent"]
  const ipAddress = (req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || undefined) as string | undefined
  const { device, browser, os } = parseUserAgent(userAgent)

  try {
    await prisma.loginHistory.create({
      data: {
        userId,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        device,
        browser,
        os,
        success,
        failureReason: success ? null : (failureReason || "invalid_credentials"),
      },
    })
  } catch (error) {
    console.error("Failed to create login history:", error)
  }
}

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["buyer", "seller", "rider"]).default("buyer"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

const googleAuthSchema = z.object({
  idToken: z.string().min(1, "Google ID token is required"),
});

const googleCompleteSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  role: z.enum(["buyer", "seller", "rider"]).default("buyer"),
});

async function verifyGoogleToken(idToken: string) {
  if (!googleClient) {
    throw new Error("Google OAuth is not configured on the server");
  }
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new Error("Invalid Google token");
  }
  return {
    email: payload.email.toLowerCase(),
    name: payload.name || payload.email.split("@")[0],
    avatar: payload.picture || "",
  };
}

router.post("/google", validateBody(googleAuthSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { idToken } = req.body;
    const googleUser = await verifyGoogleToken(idToken);

    const existingUser = await prisma.user.findUnique({
      where: { email: googleUser.email },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (existingUser) {
      const token = generateToken(existingUser);
      const { passwordHash: _, ...userWithoutPassword } = existingUser;
      return successResponse(
        res,
        { user: userWithoutPassword, token },
        200,
        "Signed in with Google",
      );
    }

    return successResponse(
      res,
      {
        isNewUser: true,
        email: googleUser.email,
        name: googleUser.name,
        avatar: googleUser.avatar,
      },
      200,
      "Please complete your registration",
    );
  } catch (error: any) {
    console.error("Google auth error:", error);
    return errorResponse(res, error.message || "Google authentication failed", 401);
  }
});

router.post(
  "/google/complete",
  validateBody(googleCompleteSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { email, name, phone, avatar, role } = req.body;
      const normalizedEmail = email.trim().toLowerCase();

      const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existingUser) {
        const token = generateToken(existingUser);
        const { passwordHash: _, ...userWithoutPassword } = existingUser;
        return successResponse(
          res,
          { user: userWithoutPassword, token },
          200,
          "Signed in with Google",
        );
      }

      const isSeller = role === "seller";
      const isRider = role === "rider";
      const userRole = await prisma.role.findUnique({
        where: { name: role === "buyer" ? "USER" : role.toUpperCase() },
      });

      const user = await prisma.user.create({
        data: {
          name,
          email: normalizedEmail,
          phone,
          passwordHash: bcrypt.hashSync(crypto.randomBytes(32).toString("hex"), 10),
          location: "",
          avatar: avatar || "",
          isSeller,
          isRider,
          isAdmin: false,
          roles: {
            create: [{ roleId: userRole!.id }],
          },
          ...(isRider
            ? {
                riderProfile: {
                  create: {
                    isOnline: false,
                    isAvailable: false,
                  },
                },
              }
            : {}),
        },
        include: {
          roles: {
            include: { role: true },
          },
        },
      });

      const token = generateToken(user);
      const { passwordHash: _, ...userWithoutPassword } = user;

      sendWelcomeEmail(user.email, user.name).catch((err) =>
        console.error("Failed to send welcome email:", err),
      );

      return successResponse(
        res,
        { user: userWithoutPassword, token },
        201,
        "Google registration successful",
      );
    } catch (error) {
      console.error("Google complete error:", error);
      return errorResponse(res, "Google registration failed", 500);
    }
  },
);

router.post("/register", validateBody(registerSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { name, phone, password, role } = req.body;
    const email = req.body.email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return errorResponse(res, "Email already registered", 409);
    }

    try {
      validatePasswordOrThrow(password);
    } catch (passwordError) {
      return errorResponse(
        res,
        passwordError instanceof Error
          ? passwordError.message
          : "Password does not meet requirements",
        400,
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const isSeller = role === "seller";
    const isRider = role === "rider";

    const userRole = await prisma.role.findUnique({
      where: { name: role === "buyer" ? "USER" : role.toUpperCase() },
    });

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        location: "",
        isSeller,
        isRider,
        isAdmin: false,
        roles: {
          create: [{ roleId: userRole!.id }],
        },
        ...(isRider
          ? {
              riderProfile: {
                create: {
                  isOnline: false,
                  isAvailable: false,
                },
              },
            }
          : {}),
      },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    const token = generateToken(user);

    const { passwordHash: _, ...userWithoutPassword } = user;

    const code = generateVerificationCode()
    const hashedCode = await hashCode(code)

    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        email,
        code,
        hashedCode,
      },
    })

    const appUrl = getAppUrl()
    const verifyUrl = `${appUrl}/auth/verify-email?email=${encodeURIComponent(email)}`

    sendWelcomeEmail(user.email, user.name).catch((err) =>
      console.error("Failed to send welcome email:", err),
    )

    const verificationHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Verify your PickAmGo email</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f9fafb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="480" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
          <tr>
            <td style="background:linear-gradient(135deg,#FF6B35,#FF8F35);padding:32px 24px;text-align:center;">
              <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0;">PickAmGo</h1>
              <p style="color:#ffffff;opacity:0.9;font-size:14px;margin:8px 0 0 0;">Verify your email address</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 24px;text-align:center;">
              <p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 24px 0;">Hi ${user.name},</p>
              <p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 24px 0;">Thanks for joining PickAmGo. Use the code below to verify your email address:</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 24px auto;">
                <tr>
                  <td style="background:#f3f4f6;border:2px dashed #e5e7eb;border-radius:12px;padding:16px 24px;text-align:center;">
                    <span style="font-size:28px;font-weight:700;letter-spacing:6px;color:#1f2937;">${code}</span>
                  </td>
                </tr>
              </table>
              <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 32px 0;">This code expires in 10 minutes. If you didn&apos;t create an account, you can safely ignore this email.</p>
              <a href="${verifyUrl}" style="display:inline-block;background:#FF6B35;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">Verify Email</a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;text-align:center;border-top:1px solid #f3f4f6;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} PickAmGo. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    const verificationText = `Hi ${user.name},

Thanks for joining PickAmGo. Use the code below to verify your email address:

${code}

This code expires in 10 minutes. If you didn't create an account, you can safely ignore this email.

Verify your email: ${verifyUrl}

© ${new Date().getFullYear()} PickAmGo. All rights reserved.`

    const emailResult = await sendEmail({
      to: email,
      subject: "Verify your PickAmGo email address",
      html: verificationHtml,
      text: verificationText,
      purpose: "email_verification",
    })

    if (!emailResult.success) {
      console.error("Failed to send verification email:", emailResult.error)
    }

    return successResponse(
      res,
      {
        user: userWithoutPassword,
        token,
        verificationSent: true,
        verifyUrl,
      },
      201,
      "Registration successful. Please verify your email.",
    );
  } catch (error) {
    return errorResponse(res, "Registration failed", 500);
  }
});

router.post("/login", validateBody(loginSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const email = req.body.email.trim().toLowerCase();
    const { password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      return errorResponse(res, "Invalid email or password", 401);
    }

    if (user.suspended || user.banned) {
      await createLoginHistory(user.id, req, false, "account_suspended")
      return errorResponse(
        res,
        "Your account has been suspended or banned. Contact support for assistance.",
        403,
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await createLoginHistory(user.id, req, false, "invalid_password")
      return errorResponse(res, "Invalid email or password", 401);
    }

    if (!user.emailVerified) {
      const code = generateVerificationCode();
      const hashedCode = await hashCode(code);

      await prisma.emailVerification.create({
        data: {
          userId: user.id,
          email: user.email,
          code,
          hashedCode,
        },
      });

      const appUrl = getAppUrl();
      const verifyUrl = `${appUrl}/auth/verify-email?email=${encodeURIComponent(user.email)}`;

      const html = buildBaseHtml("Verify your PickAmGo email", `
        <div style="text-align: center; padding: 20px 0;">
          <div style="font-size: 48px; margin-bottom: 20px;">🔐</div>
          <h2 style="color: #FF6B35; margin-bottom: 10px;">Verify Your Email</h2>
          <p style="color: #6b7280; margin-bottom: 30px;">Enter this code to verify your email address:</p>
          <div style="background: #f9fafb; border: 2px dashed #e5e7eb; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937;">${code}</span>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">This code expires in 10 minutes.</p>
          <p style="color: #6b7280; font-size: 14px;">If you didn't request this, please ignore this email.</p>
        </div>
      `);

      const text = `Verify your PickAmGo email\n\nYour verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, please ignore this email.`;

      const emailResult = await sendEmail({
        to: user.email,
        subject: "Verify your PickAmGo email address",
        html,
        text,
        purpose: "email_verification",
      });

      if (!emailResult.success) {
        console.error("Failed to send verification email:", emailResult.error);
      }

      return successResponse(
        res,
        {
          verificationRequired: true,
          email: user.email,
          verifyUrl,
        },
        200,
        "Please verify your email address.",
      );
    }

    await createLoginHistory(user.id, req, true);

    const token = generateToken(user);
    const { passwordHash: _, ...userWithoutPassword } = user;

    void (async () => {
      try {
        await sendSignInNotificationEmail(user.email, user.name, {
          date: new Date().toLocaleString(),
          browser: (req as any).get?.("user-agent") || undefined,
        });
      } catch (notificationError) {
        console.error("Failed to send sign-in notification email:", notificationError);
      }
    })();

    return successResponse(res, { user: userWithoutPassword, token });
  } catch (error: any) {
    console.error("Login error:", error);
    const message = error?.message ? error.message : "Login failed. Please try again later.";
    return errorResponse(res, message, 500);
  }
});

router.get("/me", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    const { passwordHash: _, ...userWithoutPassword } = user;

    return successResponse(res, userWithoutPassword);
  } catch (error) {
    return errorResponse(res, "Failed to fetch profile", 500);
  }
});

router.post(
  "/forgot-password",
  validateBody(forgotPasswordSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { email } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        await prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            token: tokenHash,
            expiresAt,
          },
        });

        const emailResult = await sendPasswordResetEmail(user.email, rawToken);
        if (!emailResult.success) {
          console.error("Failed to send password reset email:", emailResult.error);
        }
      }

      return successResponse(
        res,
        null,
        200,
        "If an account exists with that email, a reset link has been sent",
      );
    } catch (error) {
      console.error("Forgot password error:", error);
      return successResponse(
        res,
        null,
        200,
        "If an account exists with that email, a reset link has been sent",
      );
    }
  },
);

router.post(
  "/reset-password",
  validateBody(resetPasswordSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { token, newPassword } = req.body;

      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token: tokenHash },
        include: { user: true },
      });

      if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
        return errorResponse(res, "Invalid or expired reset token", 400);
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.$transaction([
        prisma.user.update({
          where: { id: resetToken.userId },
          data: { passwordHash: hashedPassword },
        }),
        prisma.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { used: true },
        }),
      ]);

      return successResponse(res, null, 200, "Password reset successfully");
    } catch (error) {
      console.error("Reset password error:", error);
      return errorResponse(res, "Invalid or expired reset token", 400);
    }
  },
);

router.get("/google-config", async (_req: AuthenticatedRequest, res) => {
  try {
    const googleClientId =
      process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
    return successResponse(res, {
      clientId: googleClientId,
      configured: !!googleClientId,
    });
  } catch (error) {
    return successResponse(res, { clientId: "", configured: false });
  }
});

export default router;
