"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Check } from "lucide-react";
import { api, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { OrgAvatar } from "@/components/org-avatar";
import { OtpInput } from "@/components/otp-input";
import { cn } from "@/lib/utils";

const ORG_TYPES = [
  { value: "ROTARY", label: "Rotary Club" },
  { value: "ROTARACT", label: "Rotaract Club" },
  { value: "LIONS", label: "Lions Club" },
  { value: "LEO", label: "Leo Club" },
  { value: "CHURCH", label: "Church" },
  { value: "NGO", label: "NGO" },
  { value: "ALUMNI", label: "Alumni Association" },
  { value: "PROFESSIONAL_BODY", label: "Professional Body" },
  { value: "COMMUNITY_ASSOCIATION", label: "Community Association" },
  { value: "FOUNDATION", label: "Foundation" },
  { value: "OTHER", label: "Other" },
] as const;

const passwordRules = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[A-Z]/, "One uppercase letter")
  .regex(/[a-z]/, "One lowercase letter")
  .regex(/[0-9]/, "One number");

const signupSchema = z.object({
  orgName: z.string().min(2, "Enter your organization's name"),
  orgType: z.string().min(1, "Choose a type"),
  orgContactEmail: z.string().email("Enter a valid email"),
  orgContactPhone: z.string().optional(),
  adminFirstName: z.string().min(1, "Enter your first name"),
  adminLastName: z.string().min(1, "Enter your last name"),
  adminEmail: z.string().email("Enter a valid email"),
  adminPhone: z.string().optional(),
  adminPassword: passwordRules,
});
type SignupFormValues = z.infer<typeof signupSchema>;

const STEP_FIELDS: Record<number, (keyof SignupFormValues)[]> = {
  0: ["orgName", "orgType", "orgContactEmail", "orgContactPhone"],
  1: ["adminFirstName", "adminLastName", "adminEmail", "adminPhone", "adminPassword"],
};

const STEP_LABELS = ["Organization", "Your account", "Verify email"];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [registeredUserId, setRegisteredUserId] = useState<string | null>(null);
  const [registeredSlug, setRegisteredSlug] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({ resolver: zodResolver(signupSchema) });

  async function goToNextStep() {
    const valid = await trigger(STEP_FIELDS[step]);
    if (valid) setStep((s) => s + 1);
  }

  async function onSubmitOrganization(values: SignupFormValues) {
    setServerError(null);
    try {
      const res = await api.post<{ organizationId: string; organizationSlug: string; userId: string }>(
        "/auth/register-organization",
        {
          organization: {
            name: values.orgName,
            type: values.orgType,
            contactEmail: values.orgContactEmail,
            contactPhone: values.orgContactPhone || undefined,
          },
          admin: {
            firstName: values.adminFirstName,
            lastName: values.adminLastName,
            email: values.adminEmail,
            phone: values.adminPhone || undefined,
            password: values.adminPassword,
          },
        },
        { skipAuth: true }
      );
      setRegisteredUserId(res.data.userId);
      setRegisteredSlug(res.data.organizationSlug);
      setStep(2);
    } catch (err) {
      setServerError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    }
  }

  // Starts a 30s cooldown the moment the OTP step is reached (the initial
  // code was just sent by register-organization) and again after each
  // resend — prevents accidental double-sends and gives the rate limiter
  // on the backend a matching client-side signal.
  useEffect(() => {
    if (step !== 2) return;
    setResendCooldown(30);
  }, [step]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  async function handleResend() {
    if (!registeredUserId || resendCooldown > 0) return;
    setIsResending(true);
    setOtpError(null);
    try {
      await api.post("/auth/resend-otp", { userId: registeredUserId, purpose: "EMAIL_VERIFICATION" }, { skipAuth: true });
      setResendCooldown(30);
    } catch {
      setOtpError("Couldn't resend the code. Please try again in a moment.");
    } finally {
      setIsResending(false);
    }
  }

  async function handleVerify() {
    if (!registeredUserId || otp.length !== 6) return;
    setIsVerifying(true);
    setOtpError(null);
    try {
      await api.post("/auth/verify-email", { userId: registeredUserId, code: otp, purpose: "EMAIL_VERIFICATION" }, { skipAuth: true });
      setVerified(true);
    } catch (err) {
      setOtpError(err instanceof ApiClientError ? err.message : "Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-brand-gradient opacity-20 blur-[100px]" />

      <div className="glass relative z-10 w-full max-w-md rounded-2xl p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <OrgAvatar seed="clubhub" size={44} />
          <div>
            <h1 className="font-display text-xl font-semibold">Set up your organization</h1>
            <p className="text-sm text-muted-foreground">One Platform. Every Club. Unlimited Possibilities.</p>
          </div>
        </div>

        {!verified && (
          <div className="mb-6 flex items-center justify-center gap-2">
            {STEP_LABELS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                    i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                  )}
                >
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                {i < STEP_LABELS.length - 1 && <div className="h-px w-6 bg-border" />}
              </div>
            ))}
          </div>
        )}

        {verified ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-node-emerald/10">
              <Check className="h-6 w-6 text-node-emerald" />
            </div>
            <div>
              <p className="font-medium">You're all set!</p>
              <p className="text-sm text-muted-foreground">Your organization has been created. Sign in to get started.</p>
            </div>
            <Button
              className="w-full"
              onClick={() =>
                router.push(`/login?slug=${encodeURIComponent(registeredSlug ?? "")}&email=${encodeURIComponent(getValues("adminEmail"))}`)
              }
            >
              Continue to sign in
            </Button>
          </div>
        ) : step === 2 ? (
          <div className="flex flex-col items-center gap-4 py-2">
            <p className="text-center text-sm text-muted-foreground">
              Enter the 6-digit code we sent to <span className="font-medium text-foreground">{getValues("adminEmail")}</span>
            </p>
            <OtpInput value={otp} onChange={setOtp} />
            {otpError && <p className="text-xs text-destructive">{otpError}</p>}
            <Button className="w-full" onClick={handleVerify} disabled={otp.length !== 6 || isVerifying}>
              {isVerifying ? "Verifying…" : "Verify email"}
            </Button>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || isResending}
              className="text-xs text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isResending
                ? "Sending…"
                : resendCooldown > 0
                  ? `Resend code in ${resendCooldown}s`
                  : "Didn't get a code? Resend"}
            </button>
          </div>
        ) : (
          <form onSubmit={step === 1 ? handleSubmit(onSubmitOrganization) : (e) => e.preventDefault()} className="flex flex-col gap-4">
            {step === 0 && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="orgName">Organization name</Label>
                  <Input id="orgName" placeholder="Rotary Club of Accra" {...register("orgName")} />
                  {errors.orgName && <p className="text-xs text-destructive">{errors.orgName.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="orgType">Organization type</Label>
                  <Select onValueChange={(v) => setValue("orgType", v, { shouldValidate: true })}>
                    <SelectTrigger id="orgType">
                      <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ORG_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.orgType && <p className="text-xs text-destructive">{errors.orgType.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="orgContactEmail">Organization contact email</Label>
                  <Input id="orgContactEmail" type="email" placeholder="info@rotaryaccra.org" {...register("orgContactEmail")} />
                  {errors.orgContactEmail && <p className="text-xs text-destructive">{errors.orgContactEmail.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="orgContactPhone">Organization phone (optional)</Label>
                  <Input id="orgContactPhone" {...register("orgContactPhone")} />
                </div>
                <Button type="button" onClick={goToNextStep} className="mt-2">
                  Continue
                </Button>
              </>
            )}

            {step === 1 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="adminFirstName">First name</Label>
                    <Input id="adminFirstName" {...register("adminFirstName")} />
                    {errors.adminFirstName && <p className="text-xs text-destructive">{errors.adminFirstName.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="adminLastName">Last name</Label>
                    <Input id="adminLastName" {...register("adminLastName")} />
                    {errors.adminLastName && <p className="text-xs text-destructive">{errors.adminLastName.message}</p>}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="adminEmail">Your email</Label>
                  <Input id="adminEmail" type="email" {...register("adminEmail")} />
                  {errors.adminEmail && <p className="text-xs text-destructive">{errors.adminEmail.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="adminPhone">Phone (optional)</Label>
                  <Input id="adminPhone" {...register("adminPhone")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="adminPassword">Password</Label>
                  <Input id="adminPassword" type="password" {...register("adminPassword")} />
                  {errors.adminPassword && <p className="text-xs text-destructive">{errors.adminPassword.message}</p>}
                  <p className="text-xs text-muted-foreground">At least 8 characters, with uppercase, lowercase, and a number.</p>
                </div>

                {serverError && (
                  <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {serverError}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(0)}>
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? "Creating…" : "Create organization"}
                  </Button>
                </div>
              </>
            )}
          </form>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <a href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
