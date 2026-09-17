"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrgAvatar } from "@/components/org-avatar";

const acceptInviteSchema = z.object({
  firstName: z.string().min(1, "Enter your first name"),
  lastName: z.string().min(1, "Enter your last name"),
  phone: z.string().optional(),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "One uppercase letter")
    .regex(/[a-z]/, "One lowercase letter")
    .regex(/[0-9]/, "One number"),
});
type AcceptInviteFormValues = z.infer<typeof acceptInviteSchema>;

const joinRequestSchema = z.object({
  firstName: z.string().min(1, "Enter your first name"),
  lastName: z.string().min(1, "Enter your last name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  message: z.string().optional(),
});
type JoinRequestFormValues = z.infer<typeof joinRequestSchema>;

// This is the page every invite email actually links to see
// inviteMember() in backend/src/modules/members/members.service.ts, which
// builds the link as `${CLIENT_URL}/join/${organization.slug}?token=...`.
// Split out for the same reason as /login: useSearchParams() needs a
// Suspense boundary to not break static rendering.
function AcceptInviteForm() {
  const searchParams = useSearchParams();
  const params = useParams<{ slug: string }>();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"idle" | "success">("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AcceptInviteFormValues>({ resolver: zodResolver(acceptInviteSchema) });

  async function onSubmit(values: AcceptInviteFormValues) {
    if (!token) return;
    setServerError(null);
    try {
      await api.post(
        "/members/accept-invitation",
        { token, firstName: values.firstName, lastName: values.lastName, phone: values.phone || undefined, password: values.password },
        { skipAuth: true }
      );
      setStatus("success");
    } catch (err) {
      setServerError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="glass w-full max-w-sm rounded-2xl p-8 text-center shadow-xl">
        <OrgAvatar seed={params.slug} size={44} className="mx-auto mb-4" />
        <p className="font-display text-lg font-semibold">Welcome aboard!</p>
        <p className="mt-2 text-sm text-muted-foreground">Your account is ready. You can now sign in.</p>
        <Button className="mt-6 w-full" onClick={() => (window.location.href = `/login?slug=${params.slug}`)}>
          Continue to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="glass w-full max-w-sm rounded-2xl p-8 shadow-xl">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <OrgAvatar seed={params.slug} size={44} />
        <p className="font-display text-lg font-semibold">You've been invited</p>
        <p className="text-sm text-muted-foreground">Set up your account to join.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" {...register("firstName")} />
            {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" {...register("lastName")} />
            {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" {...register("phone")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" {...register("password")} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          <p className="text-xs text-muted-foreground">At least 8 characters, with uppercase, lowercase, and a number.</p>
        </div>

        {serverError && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {serverError}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? "Setting up…" : "Join organization"}
        </Button>
      </form>
    </div>
  );
}

// Shown instead of AcceptInviteForm when there's no ?token=,  i.e. someone
// arrived here from the public landing page's "request to join" flow
// (see the public event detail page), not from an invitation email.
// Submits to the public, unauthenticated join-request endpoint rather
// than accept-invitation, since this person has no invitation at all yet.
function JoinRequestForm() {
  const searchParams = useSearchParams();
  const params = useParams<{ slug: string }>();
  const eventId = searchParams.get("eventId") ?? undefined;

  const [status, setStatus] = useState<"idle" | "success">("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<JoinRequestFormValues>({ resolver: zodResolver(joinRequestSchema) });

  async function onSubmit(values: JoinRequestFormValues) {
    setServerError(null);
    try {
      await api.post(
        `/public/organizations/${params.slug}/join-requests`,
        { ...values, eventId },
        { skipAuth: true }
      );
      setStatus("success");
    } catch (err) {
      setServerError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="glass w-full max-w-sm rounded-2xl p-8 text-center shadow-xl">
        <OrgAvatar seed={params.slug} size={44} className="mx-auto mb-4" />
        <p className="font-display text-lg font-semibold">Request sent</p>
        <p className="mt-2 text-sm text-muted-foreground">
          The organization's admins will review your request and send you an invite if approved.
        </p>
      </div>
    );
  }

  return (
    <div className="glass w-full max-w-sm rounded-2xl p-8 shadow-xl">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <OrgAvatar seed={params.slug} size={44} />
        <p className="font-display text-lg font-semibold">Request to join</p>
        <p className="text-sm text-muted-foreground">An admin will review your request.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" {...register("firstName")} />
            {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" {...register("lastName")} />
            {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" {...register("phone")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="message">Why do you want to join? (optional)</Label>
          <Input id="message" {...register("message")} />
        </div>

        {serverError && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {serverError}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? "Sending…" : "Send request"}
        </Button>
      </form>
    </div>
  );
}

// Picks which form to show based on whether ?token= is present,  an
// invitation link vs. a public join-request link. Both need the same
// Suspense boundary since both read useSearchParams().
function JoinPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  return token ? <AcceptInviteForm /> : <JoinRequestForm />;
}

export default function JoinPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-brand-gradient opacity-20 blur-[100px]" />
      <Suspense fallback={<div className="relative z-10 h-[420px] w-full max-w-sm animate-pulse rounded-2xl bg-card/50" />}>
        <JoinPageContent />
      </Suspense>
    </div>
  );
}