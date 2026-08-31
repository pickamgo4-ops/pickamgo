"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, Mail, ArrowLeft } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { api } from "../../../lib/api";

interface VerifyResponse {
  message: string;
  user?: {
    id: string;
    email: string;
    name: string;
    isSeller: boolean;
    isRider: boolean;
    isAdmin: boolean;
  };
  token?: string;
}

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailFromQuery);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [codeSent, setCodeSent] = useState(!!emailFromQuery);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSendCode = async () => {
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.post<{ message: string; verifyUrl: string }>(
        "/email-verification/send-verification",
        {
          email: email.trim(),
        },
      );

      if (response.success) {
        setCodeSent(true);
        setResendCooldown(60);
        setError("");
      } else {
        setError(response.error || "Failed to send verification code");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !code.trim()) {
      setError("Please enter both email and verification code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.post<VerifyResponse>("/email-verification/verify", {
        email: email.trim(),
        code: code.trim(),
      });

      if (response.success) {
        setSuccess(true);
        const user = response.data?.user;
        const token = response.data?.token;
        if (user && token) {
          localStorage.setItem("token", token);
          localStorage.setItem("user", JSON.stringify(user));
          window.dispatchEvent(new Event("auth-changed"));
        }
        setTimeout(() => {
          router.push("/");
        }, 2000);
      } else {
        setError(response.error || "Invalid verification code");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email.trim()) return;

    setLoading(true);
    setError("");

    try {
      const response = await api.post<{ message: string }>("/email-verification/resend", {
        email: email.trim(),
      });

      if (response.success) {
        setResendCooldown(60);
        setError("");
      } else {
        setError(response.error || "Failed to resend code");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/">
              <img
                src="/logo.png"
                alt="PickAmGo logo"
                className="h-16 w-16 rounded-2xl object-contain shadow-lg shadow-primary/20 mx-auto mb-4 cursor-pointer hover:opacity-80 transition-opacity"
              />
            </Link>
            <Link
              href="/"
              className="block text-2xl font-bold text-orange-500 hover:text-orange-600 transition-colors"
            >
              PickAmGo
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm border border-warm-200 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="text-green-600" size={32} />
            </div>
            <h1 className="font-display text-2xl font-bold text-warm-900 mb-2">Email Verified!</h1>
            <p className="text-warm-800/60 mb-6">
              Your email has been successfully verified. Redirecting you to the homepage...
            </p>
            <Button fullWidth onClick={() => router.push("/")}>
              Continue to PickAmGo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/">
            <img
              src="/logo.png"
              alt="PickAmGo logo"
              className="h-16 w-16 rounded-2xl object-contain shadow-lg shadow-primary/20 mx-auto mb-4 cursor-pointer hover:opacity-80 transition-opacity"
            />
          </Link>
          <Link
            href="/"
            className="block text-2xl font-bold text-orange-500 hover:text-orange-600 transition-colors"
          >
            PickAmGo
          </Link>
          <h1 className="font-display text-3xl font-bold text-warm-900 mb-2">Verify your email</h1>
          <p className="text-warm-800/60">
            {codeSent
              ? "Enter the 6-digit code we sent to your email"
              : "Enter your email to receive a verification code"}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {!codeSent ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-warm-900 mb-1.5">
                  Email address
                </label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onValueChange={setEmail}
                  icon={<Mail size={20} />}
                />
              </div>
              <Button fullWidth onClick={handleSendCode} disabled={loading || !email.trim()}>
                {loading ? "Sending..." : "Send Verification Code"}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-warm-900 mb-1.5">
                  Email address
                </label>
                <Input
                  type="email"
                  value={email}
                  onValueChange={setEmail}
                  icon={<Mail size={20} />}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-warm-900 mb-1.5">
                  Verification code
                </label>
                <Input
                  type="text"
                  placeholder="000000"
                  value={code}
                  onValueChange={setCode}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                />
              </div>

              <Button fullWidth type="submit" disabled={loading || code.length !== 6}>
                {loading ? "Verifying..." : "Verify Email"}
              </Button>
            </form>
          )}

          {codeSent && (
            <div className="mt-4 pt-4 border-t border-warm-200">
              <div className="text-center">
                <p className="text-sm text-warm-800/60 mb-2">Didn&apos;t receive the code?</p>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                  className="text-sm text-primary hover:text-primary-dark font-medium disabled:text-warm-800/40 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1 text-sm text-warm-800/60 hover:text-warm-800"
            >
              <ArrowLeft size={16} />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function VerifyEmailLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-warm-200 rounded w-1/2 mx-auto" />
            <div className="h-4 bg-warm-200 rounded w-3/4 mx-auto" />
            <div className="h-12 bg-warm-200 rounded w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailLoading />}>
      <VerifyEmailForm />
    </Suspense>
  );
}
