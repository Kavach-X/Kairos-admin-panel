"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  sendLoginOtp,
  sendPhoneLoginOtp,
  verifyAdminRole,
} from "@/lib/actions/auth.actions";
import { authClient } from "@/lib/auth-client";
import {
  AlertCircle,
  Mail,
  Phone,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

type AuthMethod = "email" | "phone";
type Step = "input" | "otp";

interface LoginFormProps {
  initialError?: string;
}

export function LoginForm({ initialError }: LoginFormProps) {
  const router = useRouter();
  const [method, setMethod] = useState<AuthMethod>("email");
  const [step, setStep] = useState<Step>("input");
  const [targetIdentifier, setTargetIdentifier] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // If redirected with an authorization error, show message and clean up
  useEffect(() => {
    if (initialError === "unauthorized") {
      setError(
        "Access denied: This account is authenticated but does not possess SuperAdmin privileges in Kairos."
      );
      authClient.signOut().catch(() => {});
    } else if (initialError) {
      setError("Authentication failed. Please verify your credentials.");
    }
  }, [initialError]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Focus OTP input when step changes
  useEffect(() => {
    if (step === "otp") {
      otpInputRef.current?.focus();
    }
  }, [step]);

  function normalizePhone(val: string): string {
    const cleaned = val.replace(/[\s-]/g, "");
    if (!cleaned) return "";
    return cleaned.startsWith("+") ? cleaned : `+91${cleaned}`;
  }

  // ─── 1. Send OTP ──────────────────────────────────────────
  function handleSendOtp(formData: FormData) {
    setError(null);
    setSuccessNotice(null);

    startTransition(async () => {
      if (method === "email") {
        const emailVal = (formData.get("email") as string || "").trim();
        const result = await sendLoginOtp(null, formData);
        if (result.success) {
          setTargetIdentifier(emailVal);
          setStep("otp");
          setResendCooldown(30);
          setSuccessNotice(`Verification code sent to ${emailVal}`);
        } else {
          setError(result.error || "Failed to send email verification code.");
        }
      } else {
        const rawPhone = (formData.get("phoneNumber") as string || "").trim();
        const formatted = normalizePhone(rawPhone);
        const result = await sendPhoneLoginOtp(null, formData);
        if (result.success) {
          setTargetIdentifier(formatted);
          setStep("otp");
          setResendCooldown(30);
          setSuccessNotice(`Verification code sent to ${formatted}`);
        } else {
          setError(result.error || "Failed to send SMS verification code.");
        }
      }
    });
  }

  // ─── 2. Resend OTP ────────────────────────────────────────
  function handleResendOtp() {
    if (resendCooldown > 0 || !targetIdentifier) return;
    setError(null);

    startTransition(async () => {
      const fd = new FormData();
      if (method === "email") {
        fd.set("email", targetIdentifier);
        const res = await sendLoginOtp(null, fd);
        if (res.success) {
          setResendCooldown(30);
          setSuccessNotice("Verification code resent.");
        } else {
          setError(res.error || "Failed to resend code.");
        }
      } else {
        fd.set("phoneNumber", targetIdentifier);
        const res = await sendPhoneLoginOtp(null, fd);
        if (res.success) {
          setResendCooldown(30);
          setSuccessNotice("SMS verification code resent.");
        } else {
          setError(res.error || "Failed to resend SMS.");
        }
      }
    });
  }

  // ─── 3. Verify OTP & Authenticate ─────────────────────────
  function handleVerifyOtp(formData: FormData) {
    setError(null);
    setSuccessNotice(null);

    startTransition(async () => {
      const otpValue = (formData.get("otp") as string || "").trim();

      if (!otpValue || otpValue.length !== 6) {
        setError("Please enter the 6-digit verification code.");
        return;
      }

      try {
        let sessionToken: string | undefined;

        if (method === "email") {
          const signInResult = await authClient.signIn.emailOtp({
            email: targetIdentifier,
            otp: otpValue,
          });

          if (signInResult.error) {
            setError(signInResult.error.message || "Invalid code. Please try again.");
            return;
          }
          const data = signInResult.data as Record<string, any> | undefined;
          sessionToken = data?.token || data?.session?.token;
        } else {
          const verifyResult = await authClient.phoneNumber.verify({
            phoneNumber: targetIdentifier,
            code: otpValue,
          });

          if (verifyResult.error) {
            setError(verifyResult.error.message || "Invalid SMS code. Please try again.");
            return;
          }
          const data = verifyResult.data as Record<string, any> | undefined;
          sessionToken = data?.token || data?.session?.token;
        }

        // Fallback: Retrieve token from getSession if not directly in response body
        if (!sessionToken) {
          const sessionData = await authClient.getSession();
          const sess = sessionData.data as Record<string, any> | undefined;
          sessionToken = sess?.session?.token || sess?.token;
        }

        // Validate Admin Role server-side
        const adminResult = await verifyAdminRole(sessionToken);

        if (!adminResult.success) {
          await authClient.signOut();
          setError(adminResult.error || "Access denied: Account is not authorized as an administrator.");
          return;
        }

        if (adminResult.setCookie) {
          localStorage.setItem("x-business-account-id", adminResult.setCookie);
        }

        router.push("/dashboard");
        router.refresh();
      } catch {
        setError("An unexpected error occurred during authentication.");
      }
    });
  }

  // ─── 4. Google OAuth Sign In ───────────────────────────────
  function handleGoogleSignIn() {
    setError(null);
    startTransition(async () => {
      try {
        // Use full absolute frontend callback URL so Better Auth redirects back to Next.js
        const callbackURL = `${window.location.origin}/dashboard`;
        await authClient.signIn.social({
          provider: "google",
          callbackURL,
        });
      } catch {
        setError("Failed to initiate Google sign-in. Please try again.");
      }
    });
  }

  function handleBack() {
    setStep("input");
    setError(null);
    setSuccessNotice(null);
  }

  return (
    <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs">
      {/* Error alert */}
      {error && (
        <Alert variant="destructive" className="mb-4 text-xs py-2.5">
          <AlertCircle className="size-3.5" />
          <AlertDescription className="text-xs leading-relaxed">{error}</AlertDescription>
        </Alert>
      )}

      {/* Success notice */}
      {successNotice && !error && (
        <Alert className="mb-4 border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs py-2.5">
          <CheckCircle2 className="size-3.5" />
          <AlertDescription className="text-xs">{successNotice}</AlertDescription>
        </Alert>
      )}

      {step === "input" ? (
        <div className="space-y-4">
          {/* Segmented control tabs */}
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted/60 p-0.5 border border-border/40">
            <button
              type="button"
              onClick={() => {
                setMethod("email");
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all ${
                method === "email"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mail className="size-3.5" />
              Email OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setMethod("phone");
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all ${
                method === "phone"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Phone className="size-3.5" />
              Phone OTP
            </button>
          </div>

          {/* Form */}
          <form action={handleSendOtp} className="space-y-3">
            {method === "email" ? (
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Admin Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="admin@kairos.com"
                  required
                  autoFocus
                  disabled={isPending}
                  className="h-9 text-xs"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label
                  htmlFor="phoneNumber"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Mobile Number
                </label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  placeholder="+91 98765 43210"
                  required
                  autoFocus
                  disabled={isPending}
                  className="h-9 font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground/70">
                  Enter mobile with country code (e.g. +91)
                </p>
              </div>
            )}

            <Button type="submit" className="w-full h-9 text-xs" disabled={isPending}>
              {isPending ? (
                <>
                  <Spinner className="size-3.5" />
                  Sending code...
                </>
              ) : (
                `Send ${method === "email" ? "Email" : "SMS"} code`
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-[11px]">
              <span className="bg-card px-2 text-muted-foreground/80">
                or
              </span>
            </div>
          </div>

          {/* Google Sign In */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-9 text-xs gap-2 font-normal hover:bg-muted/50"
            disabled={isPending}
            onClick={handleGoogleSignIn}
          >
            <svg className="size-3.5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            <span>Continue with Google</span>
          </Button>
        </div>
      ) : (
        /* OTP Step */
        <div className="space-y-3.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBack}
              disabled={isPending}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-3.5" />
            </button>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">Enter verification code</p>
              <p className="truncate text-[11px] text-muted-foreground">
                Sent to <span className="font-medium text-foreground">{targetIdentifier}</span>
              </p>
            </div>
          </div>

          <form action={handleVerifyOtp} className="space-y-3">
            <div>
              <Input
                ref={otpInputRef}
                id="otp"
                name="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="••••••"
                required
                autoFocus
                disabled={isPending}
                className="h-10 font-mono text-center text-lg tracking-widest"
              />
            </div>

            <Button type="submit" className="w-full h-9 text-xs" disabled={isPending}>
              {isPending ? (
                <>
                  <Spinner className="size-3.5" />
                  Verifying...
                </>
              ) : (
                "Verify & Sign in"
              )}
            </Button>
          </form>

          <div className="flex items-center justify-between text-[11px] pt-1">
            <button
              type="button"
              onClick={handleBack}
              disabled={isPending}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Change {method === "email" ? "email" : "number"}
            </button>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={isPending || resendCooldown > 0}
              className={`font-medium transition-colors ${
                resendCooldown > 0
                  ? "text-muted-foreground/60 cursor-not-allowed"
                  : "text-foreground hover:underline"
              }`}
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
