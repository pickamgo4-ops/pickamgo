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
import { compareCode, generateVerificationCode, hashCode } from "../utils/email-verification";
import { getAppUrl } from "../utils/url";
import { consumeRateLimit, getRequestIp, getRateLimitConfig, hashIdentity, isRateLimited } from "../middleware/rate-limit";
import { createAndSendOtp, normalizeGhanaPhone, OTP_PURPOSES, verifyOtp } from '../services/otpService';

const router = Router();

const accountDeletionSchema = z.object({
  confirmation: z.literal('DELETE'),
});

function getGoogleClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  return clientId ? { client: new OAuth2Client(clientId), clientId } : null;
}

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
  identifier: z.string().min(1, "Email or phone is required"),
  password: z.string().min(1, "Password is required"),
});

const loginVerificationSendSchema = z.object({
  pendingToken: z.string().min(1),
  method: z.enum(["SMS", "EMAIL"]),
});

const loginVerificationSchema = z.object({
  pendingToken: z.string().min(1),
  code: z.string().regex(/^\d{6}$/, "Verification code must be exactly 6 digits"),
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
  idToken: z.string().min(1, "Google ID token is required"),
  phone: z.string().optional(),
  role: z.enum(["buyer", "seller", "rider"]).default("buyer"),
});

const phoneOtpSchema = z.object({
  phoneNumber: z.string().min(10),
  purpose: z.enum(OTP_PURPOSES),
});

const phoneOtpVerifySchema = phoneOtpSchema.extend({
  otp: z.string().regex(/^\d{4,8}$/),
});

const phoneLoginSchema = z.object({
  phoneNumber: z.string().min(10),
});

const phoneLoginVerifySchema = phoneLoginSchema.extend({
  otp: z.string().regex(/^\d{4,8}$/),
});

const pendingChallengeMinutes = 10;

function hashPendingToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}

function maskPhone(phone: string): string {
  return `••••${phone.slice(-4)}`;
}

async function sendLoginEmailCode(user: { id: string; email: string; name: string }, challengeId: string) {
  const code = generateVerificationCode();
  const codeHash = await hashCode(code);
  const codeExpiresAt = new Date(Date.now() + 10 * 60_000);
  await prisma.loginChallenge.update({
    where: { id: challengeId },
    data: { method: "EMAIL", codeHash, codeExpiresAt, attempts: 0 },
  });

  const result = await sendEmail({
    to: user.email,
    subject: "Your PickAmGo sign-in code",
    html: buildBaseHtml("Your PickAmGo sign-in code", `<h2>Verify your sign-in</h2><p>Hi ${user.name},</p><p>Use this code to finish signing in:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;">${code}</p><p>This code expires in 10 minutes.</p>`),
    text: `Your PickAmGo sign-in code is ${code}. It expires in 10 minutes.`,
    purpose: "email_verification",
  });
  if (!result.success) throw new Error("Unable to send verification code");
}

async function createPendingLoginChallenge(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const challenge = await prisma.loginChallenge.create({
    data: {
      userId,
      tokenHash: hashPendingToken(token),
      expiresAt: new Date(Date.now() + pendingChallengeMinutes * 60_000),
    },
  });
  return { token, challenge };
}

function availableLoginMethods(user: { email: string; phone: string | null; phoneVerified: boolean }) {
  const methods: Array<"SMS" | "EMAIL"> = [];
  if (user.phone && user.phoneVerified) methods.push("SMS");
  if (user.email) methods.push("EMAIL");
  return methods;
}

async function verifyGoogleToken(idToken: string) {
  const googleConfig = getGoogleClient();
  if (!googleConfig) {
    throw new Error("Google OAuth is not configured on the server");
  }
  const ticket = await googleConfig.client.verifyIdToken({
    idToken,
    audience: googleConfig.clientId,
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
    return errorResponse(res, "Google sign-in failed. Please try again.", 401);
  }
});

router.post(
  "/google/complete",
  validateBody(googleCompleteSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { idToken, phone, role } = req.body;
      const googleUser = await verifyGoogleToken(idToken);
      const { email: normalizedEmail, name, avatar } = googleUser;

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
      return errorResponse(res, "Google registration failed", 401);
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

    let phoneVerificationRequired = false
    if (phone) {
      try {
        await createAndSendOtp({
          phoneNumber: phone,
          purpose: 'PHONE_VERIFICATION',
          userId: user.id,
          request: req,
        })
        phoneVerificationRequired = true
      } catch (phoneError) {
        console.error('Failed to send registration phone verification code:', phoneError instanceof Error ? phoneError.message : 'unknown error')
      }
    }

    return successResponse(
      res,
      {
        user: userWithoutPassword,
        token,
        verificationSent: true,
        phoneVerificationRequired,
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
    const identifier = req.body.identifier.trim();
    const email = identifier.toLowerCase();
    const { password } = req.body;
    const ip = getRequestIp(req);
    const loginAccount = getRateLimitConfig('login')
    const loginIp = getRateLimitConfig('login-ip', { limit: 20, windowMs: 15 * 60_000 })
    const loginBlocked = await isRateLimited('login-email', email, loginAccount.limit, loginAccount.windowMs) || await isRateLimited('login-ip', ip, loginIp.limit, loginIp.windowMs)
    if (loginBlocked) return errorResponse(res, 'Too many login attempts. Please try again later.', 429)

    const recordFailedLogin = async () => {
      await consumeRateLimit('login-email', email, loginAccount.limit, loginAccount.windowMs)
      await consumeRateLimit('login-ip', ip, loginIp.limit, loginIp.windowMs)
    }

    const normalizedPhone = (() => {
      try { return normalizeGhanaPhone(identifier) } catch { return null }
    })();
    const user = await prisma.user.findFirst({
      where: normalizedPhone ? { OR: [{ email }, { phone: normalizedPhone }] } : { email },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      await recordFailedLogin()
      return errorResponse(res, "Invalid email or password", 401);
    }

    if (user.suspended || user.banned) {
      await recordFailedLogin()
      await createLoginHistory(user.id, req, false, "account_suspended")
      return errorResponse(res, "Invalid email or password", 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await recordFailedLogin()
      await createLoginHistory(user.id, req, false, "invalid_password")
      return errorResponse(res, "Invalid email or password", 401);
    }

    const methods = availableLoginMethods(user);
    if (methods.length === 0) {
      await createLoginHistory(user.id, req, false, "no_verification_method");
      return errorResponse(res, "No verification method is available for this account", 400);
    }

    const { token } = await createPendingLoginChallenge(user.id);
    return successResponse(res, {
      verificationRequired: true,
      pendingToken: token,
      methods,
      email: maskEmail(user.email),
      phone: user.phone && user.phoneVerified ? maskPhone(user.phone) : undefined,
    }, 200, "Choose a verification method to finish signing in.");
  } catch (error: any) {
    console.error("Login error:", error);
    const message = error?.message ? error.message : "Login failed. Please try again later.";
    return errorResponse(res, message, 500);
  }
});

router.post('/login/verification/send', validateBody(loginVerificationSendSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { pendingToken, method } = req.body;
    const challenge = await prisma.loginChallenge.findUnique({ where: { tokenHash: hashPendingToken(pendingToken) }, include: { user: true } });
    if (!challenge || challenge.used || challenge.expiresAt <= new Date()) return errorResponse(res, 'Verification session expired. Please sign in again.', 401);

    const methods = availableLoginMethods(challenge.user);
    if (!methods.includes(method)) return errorResponse(res, 'That verification method is unavailable.', 400);

    if (method === 'SMS') {
      await createAndSendOtp({ phoneNumber: challenge.user.phone!, purpose: 'LOGIN', userId: challenge.user.id, request: req });
      await prisma.loginChallenge.update({ where: { id: challenge.id }, data: { method: 'SMS', codeHash: null, codeExpiresAt: null, attempts: 0 } });
    } else {
      await sendLoginEmailCode(challenge.user, challenge.id);
    }

    return successResponse(res, { method }, 200, 'Verification code sent.');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send verification code';
    return errorResponse(res, message.startsWith('Too many') || message.startsWith('Please wait') ? message : 'Unable to send verification code', message.startsWith('Too many') || message.startsWith('Please wait') ? 429 : 400);
  }
});

router.post('/login/verification/verify', validateBody(loginVerificationSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { pendingToken, code } = req.body;
    const tokenHash = hashPendingToken(pendingToken);
    const challenge = await prisma.loginChallenge.findUnique({ where: { tokenHash }, include: { user: true } });
    if (!challenge || challenge.used || challenge.expiresAt <= new Date()) return errorResponse(res, 'Verification session expired. Please sign in again.', 401);

    const blocked = await isRateLimited('login-verification-token', tokenHash, 10, 15 * 60_000) || await isRateLimited('login-verification-ip', getRequestIp(req), 20, 15 * 60_000);
    if (blocked) return errorResponse(res, 'Too many verification attempts. Please sign in again later.', 429);
    await consumeRateLimit('login-verification-token', tokenHash, 10, 15 * 60_000);
    await consumeRateLimit('login-verification-ip', getRequestIp(req), 20, 15 * 60_000);

    if (!challenge.method) return errorResponse(res, 'Choose a verification method first.', 400);
    if (challenge.method === 'SMS') {
      await verifyOtp({ phoneNumber: challenge.user.phone!, otp: code, purpose: 'LOGIN', userId: challenge.user.id });
    } else {
      if (!challenge.codeHash || !challenge.codeExpiresAt || challenge.codeExpiresAt <= new Date()) return errorResponse(res, 'This verification code has expired. Please request a new one.', 400);
      if (challenge.attempts >= challenge.maxAttempts) return errorResponse(res, 'This verification code is no longer valid. Please request a new one.', 429);
      const valid = await compareCode(code, challenge.codeHash);
      if (!valid) {
        const updated = await prisma.loginChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
        if (updated.attempts >= updated.maxAttempts) await prisma.loginChallenge.update({ where: { id: challenge.id }, data: { used: true } });
        return errorResponse(res, updated.attempts >= updated.maxAttempts ? 'This verification code is no longer valid. Please request a new one.' : 'Invalid verification code', 400);
      }
    }

    if (challenge.method === 'EMAIL' && !challenge.user.emailVerified) {
      await prisma.user.update({ where: { id: challenge.user.id }, data: { emailVerified: true } });
    }
    await prisma.loginChallenge.update({ where: { id: challenge.id }, data: { used: true } });
    await createLoginHistory(challenge.user.id, req, true);
    const token = generateToken(challenge.user);
    const { passwordHash: _, ...userWithoutPassword } = challenge.user;
    void sendSignInNotificationEmail(challenge.user.email, challenge.user.name, { date: new Date().toLocaleString(), browser: (req as any).get?.('user-agent') || undefined }).catch(error => console.error('Failed to send sign-in notification email:', error));
    return successResponse(res, { user: userWithoutPassword, token }, 200, 'Signed in successfully');
  } catch (error) {
    return errorResponse(res, error instanceof Error ? error.message : 'Invalid verification code', 401);
  }
});

router.post('/login/otp/send', (_req, res) => {
  return errorResponse(res, 'Enter your password first, then choose SMS verification.', 410, 'PASSWORD_REQUIRED_FOR_LOGIN')
})

router.post('/login/otp/send-legacy', validateBody(phoneLoginSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const phoneNumber = normalizeGhanaPhone(req.body.phoneNumber)
    const user = await prisma.user.findFirst({ where: { phone: phoneNumber, phoneVerified: true } })

    if (user && !user.suspended && !user.banned) {
      const result = await createAndSendOtp({ phoneNumber, purpose: 'LOGIN', userId: user.id, request: req })
      return successResponse(res, { phoneNumber: result.phoneNumber, cooldownSeconds: result.cooldownSeconds }, 200, 'If an eligible account exists, a verification code has been sent.')
    }

    return successResponse(res, null, 200, 'If an eligible account exists, a verification code has been sent.')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send verification code'
    if (message.startsWith('Too many') || message.startsWith('Please wait')) return errorResponse(res, message, 429)
    return successResponse(res, null, 200, 'If an eligible account exists, a verification code has been sent.')
  }
})

router.post('/login/otp/verify', (_req, res) => {
  return errorResponse(res, 'Enter your password first, then choose SMS verification.', 410, 'PASSWORD_REQUIRED_FOR_LOGIN')
})

router.post('/login/otp/verify-legacy', validateBody(phoneLoginVerifySchema), async (req: AuthenticatedRequest, res) => {
  try {
    const phoneNumber = normalizeGhanaPhone(req.body.phoneNumber)
    const user = await prisma.user.findFirst({ where: { phone: phoneNumber, phoneVerified: true } })
    if (!user || user.suspended || user.banned) return errorResponse(res, 'Invalid verification code', 401)

    await verifyOtp({ phoneNumber, otp: req.body.otp, purpose: 'LOGIN', userId: user.id })
    await createLoginHistory(user.id, req, true)
    const token = generateToken(user)
    const { passwordHash: _, ...userWithoutPassword } = user
    return successResponse(res, { user: userWithoutPassword, token }, 200, 'Signed in successfully')
  } catch (error) {
    return errorResponse(res, error instanceof Error ? error.message : 'Invalid verification code', 401)
  }
})

router.post('/otp/send', authMiddleware, validateBody(phoneOtpSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { phoneNumber, purpose } = req.body
    if (!['PHONE_VERIFICATION', 'PHONE_CHANGE', 'SELLER_VERIFICATION', 'RIDER_VERIFICATION', 'LOGIN'].includes(purpose)) {
      return errorResponse(res, 'Invalid OTP purpose', 400)
    }
    const result = await createAndSendOtp({ phoneNumber, purpose, userId: req.user!.id, request: req })
    return successResponse(res, { phoneNumber: result.phoneNumber, expiresAt: result.expiresAt, cooldownSeconds: result.cooldownSeconds }, 200, 'Verification code sent.')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send verification code'
    return errorResponse(res, message, message.startsWith('Too many') || message.startsWith('Please wait') ? 429 : 400)
  }
})

router.post('/otp/resend', authMiddleware, validateBody(phoneOtpSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { phoneNumber, purpose } = req.body
    const result = await createAndSendOtp({ phoneNumber, purpose, userId: req.user!.id, request: req })
    return successResponse(res, { phoneNumber: result.phoneNumber, expiresAt: result.expiresAt, cooldownSeconds: result.cooldownSeconds }, 200, 'Verification code sent.')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send verification code'
    return errorResponse(res, message, message.startsWith('Too many') || message.startsWith('Please wait') ? 429 : 400)
  }
})

router.post('/otp/verify', authMiddleware, validateBody(phoneOtpVerifySchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { phoneNumber, otp, purpose } = req.body
    const result = await verifyOtp({ phoneNumber, otp, purpose, userId: req.user!.id })
    const updatePhone = ['PHONE_VERIFICATION', 'PHONE_CHANGE', 'SELLER_VERIFICATION', 'RIDER_VERIFICATION'].includes(purpose)
    if (updatePhone) {
      await prisma.user.update({ where: { id: req.user!.id }, data: { phone: result.phoneNumber, phoneVerified: true } })
    }
    return successResponse(res, { phoneNumber: result.phoneNumber, verified: true }, 200, 'Verification successful.')
  } catch (error) {
    return errorResponse(res, error instanceof Error ? error.message : 'Invalid verification code', 400)
  }
})

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

router.delete('/me', authMiddleware, validateBody(accountDeletionSchema), async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  try {
    await prisma.$transaction(async tx => {
      const shops = await tx.shop.findMany({ where: { ownerId: userId }, select: { id: true } });
      const shopIds = shops.map(shop => shop.id);
      const products = await tx.product.findMany({ where: { sellerId: userId }, select: { id: true } });
      const services = await tx.service.findMany({ where: { providerId: userId }, select: { id: true } });
      const productIds = products.map(product => product.id);
      const serviceIds = services.map(service => service.id);

      // Preserve transaction structure while removing references to the person.
      await tx.order.updateMany({ where: { OR: [{ customerId: userId }, { sellerId: userId }, { riderId: userId }, ...(shopIds.length ? [{ shopId: { in: shopIds } }] : [])] }, data: { customerId: null, sellerId: null, riderId: null, shopId: null, guestName: null, guestPhone: null, guestEmail: null, deliveryAddress: 'Address removed', notes: null } });
      await tx.orderItem.updateMany({ where: { OR: [...(productIds.length ? [{ productId: { in: productIds } }] : []), ...(serviceIds.length ? [{ serviceId: { in: serviceIds } }] : [])] }, data: { productId: null, serviceId: null, variantId: null } });
      await tx.cartItem.updateMany({ where: { OR: [...(productIds.length ? [{ productId: { in: productIds } }] : []), ...(serviceIds.length ? [{ serviceId: { in: serviceIds } }] : [])] }, data: { productId: null, serviceId: null, variantId: null } });
      await tx.booking.updateMany({ where: { OR: [{ customerId: userId }, { providerId: userId }, ...(shopIds.length ? [{ shopId: { in: shopIds } }] : [])] }, data: { customerId: null, providerId: null, notes: null } });
      await tx.delivery.updateMany({ where: { riderId: userId }, data: { riderId: null } });
      await tx.refund.updateMany({ where: { OR: [{ customerId: userId }, { sellerId: userId }] }, data: { customerId: null, sellerId: null } });
      await tx.dispute.updateMany({ where: { OR: [{ customerId: userId }, { sellerId: userId }] }, data: { customerId: null, sellerId: null } });
      await tx.payout.updateMany({ where: { userId }, data: { userId: null, payoutMethodId: null } });
      await tx.financialLedger.updateMany({ where: { userId }, data: { userId: null } });
      await tx.sellerEarnings.updateMany({ where: { sellerId: userId }, data: { sellerId: null } });
      await tx.riderEarnings.updateMany({ where: { riderId: userId }, data: { riderId: null } });
      await tx.promoRedemption.updateMany({ where: { customerId: userId }, data: { customerId: null, guestIdentifier: null } });
      await tx.emailLog.updateMany({ where: { userId }, data: { userId: null, to: 'deleted-account@invalid' } });
      await tx.emailCampaign.updateMany({ where: { sentBy: userId }, data: { sentBy: null } });
      await tx.promoCode.updateMany({ where: { OR: [{ createdBy: userId }, { sellerId: userId }] }, data: { createdBy: null, sellerId: null } });
      await tx.publicNotice.updateMany({ where: { createdBy: userId }, data: { createdBy: null } });
      await tx.productView.updateMany({ where: { userId }, data: { userId: null } });
      await tx.inventoryMovement.updateMany({ where: { userId }, data: { userId: null } });
      await tx.publicNoticeDismissal.updateMany({ where: { userId }, data: { userId: null } });

      await tx.message.deleteMany({ where: { senderId: userId } });
      await tx.conversation.deleteMany({ where: { OR: [{ participant1Id: userId }, { participant2Id: userId }] } });
      await tx.report.deleteMany({ where: { reporterId: userId } });
      await tx.review.deleteMany({ where: { userId } });
      await tx.favorite.deleteMany({ where: { userId } });
      await tx.shopFollow.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.notificationPreference.deleteMany({ where: { userId } });
      await tx.address.deleteMany({ where: { userId } });
      await tx.searchHistory.deleteMany({ where: { userId } });
      await tx.payoutMethod.deleteMany({ where: { userId } });
      await tx.cart.deleteMany({ where: { userId } });
      await tx.sellerVerification.deleteMany({ where: { userId } });
      await tx.phoneOtp.deleteMany({ where: { userId } });
      await tx.emailVerification.deleteMany({ where: { userId } });
      await tx.loginChallenge.deleteMany({ where: { userId } });
      await tx.passwordResetToken.deleteMany({ where: { userId } });
      await tx.loginHistory.deleteMany({ where: { userId } });
      await tx.auditLog.deleteMany({ where: { actorId: userId } });

      await tx.product.deleteMany({ where: { sellerId: userId } });
      await tx.service.deleteMany({ where: { providerId: userId } });
      await tx.shop.deleteMany({ where: { ownerId: userId } });
      await tx.rider.deleteMany({ where: { userId } });
      await tx.userRole.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });
    return successResponse(res, null, 200, 'Account permanently deleted');
  } catch (error) {
    console.error('Account deletion failed:', error);
    return errorResponse(res, 'Unable to delete your account. Nothing was changed. Please try again.', 500);
  }
});

router.post("/logout", authMiddleware, async (req: AuthenticatedRequest, res) => {
  return successResponse(res, null, 200, "Logged out successfully");
});

router.post(
  "/forgot-password",
  validateBody(forgotPasswordSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const email = req.body.email.trim().toLowerCase();
      const ip = getRequestIp(req)
      const resetAccount = getRateLimitConfig('password-reset')
      const resetIp = getRateLimitConfig('password-reset-ip', { limit: 10, windowMs: 60 * 60_000 })
      const blocked = await isRateLimited('password-reset-email', email, resetAccount.limit, resetAccount.windowMs) || await isRateLimited('password-reset-ip', ip, resetIp.limit, resetIp.windowMs)
      if (blocked) return errorResponse(res, 'Too many requests. Please try again later.', 429)
      await consumeRateLimit('password-reset-email', email, resetAccount.limit, resetAccount.windowMs)
      await consumeRateLimit('password-reset-ip', ip, resetIp.limit, resetIp.windowMs)

      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        await prisma.passwordResetToken.updateMany({
          where: { userId: user.id, used: false },
          data: { used: true },
        });
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
      const ip = getRequestIp(req)
      const tokenIdentity = hashIdentity(crypto.createHash('sha256').update(token).digest('hex'))
      const blocked = await isRateLimited('password-reset-token', tokenIdentity, 5, 15 * 60_000) || await isRateLimited('password-reset-ip', ip, 10, 60 * 60_000)
      if (blocked) return errorResponse(res, 'Too many requests. Please try again later.', 429)
      await consumeRateLimit('password-reset-token', tokenIdentity, 5, 15 * 60_000)
      await consumeRateLimit('password-reset-ip', ip, 10, 60 * 60_000)

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
          data: { passwordHash: hashedPassword, authVersion: { increment: 1 } },
        }),
        prisma.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { used: true },
        }),
        prisma.passwordResetToken.updateMany({
          where: { userId: resetToken.userId, id: { not: resetToken.id }, used: false },
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
    const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
    return successResponse(res, {
      clientId: googleClientId,
      configured: !!googleClientId,
    });
  } catch (error) {
    return successResponse(res, { clientId: "", configured: false });
  }
});

export default router;
