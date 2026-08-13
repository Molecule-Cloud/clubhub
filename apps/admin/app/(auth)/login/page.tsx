"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth, ApiClientError } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrgAvatar } from "@/components/org-avatar";

const loginSchema = z.object({
  organizationSlug: z.string().min(1, "Enter your organization's ClubHub URL"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// useSearchParams() opts a component out of static rendering unless it's
// wrapped in Suspense — split out so the outer page can provide that
// boundary and prefill (slug, email) from the signup wizard's redirect
// still works without breaking the build's static optimization.
function LoginForm() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      organizationSlug: searchParams.get("slug") ?? "",
      email: searchParams.get("email") ?? "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      await login(values.email, values.password, values.organizationSlug);
    } catch (err) {
      setServerError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="glass relative z-10 w-full max-w-sm rounded-2xl p-8 shadow-xl">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <OrgAvatar seed="clubhub" size={48} />
        <div>
          <h1 className="font-display text-xl font-semibold">ClubHub</h1>
          <p className="text-sm text-muted-foreground">One Platform. Every Club. Unlimited Possibilities.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="organizationSlug">Organization</Label>
          <Input id="organizationSlug" placeholder="rotary-accra" {...register("organizationSlug")} autoComplete="organization" />
          {errors.organizationSlug && <p className="text-xs text-destructive">{errors.organizationSlug.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" {...register("email")} autoComplete="email" />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" {...register("password")} autoComplete="current-password" />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        {serverError && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {serverError}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Setting up a new organization?{" "}
        <a href="/signup" className="font-medium text-primary hover:underline">
          Get started
        </a>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      {/* Ambient brand gradient — one of the two deliberate glassmorphism
          touchpoints in the whole product (the other is the sidebar header). */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-brand-gradient opacity-20 blur-[100px]" />
      <Suspense fallback={<div className="relative z-10 h-[420px] w-full max-w-sm animate-pulse rounded-2xl bg-card/50" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
