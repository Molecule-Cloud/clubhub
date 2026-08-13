"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Upload, ChevronRight, ShieldCheck } from "lucide-react";
import { useOrganization, useUpdateOrganization, useUpdateLogo } from "@/hooks/use-organization";
import { useToast } from "@/components/ui/toast";
import { ApiClientError } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrgAvatar } from "@/components/org-avatar";

const brandingSchema = z.object({
  name: z.string().min(2, "Enter your organization's name"),
  contactEmail: z.string().email("Enter a valid email"),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Enter a valid hex color, e.g. #2563EB")
    .optional()
    .or(z.literal("")),
});
type BrandingFormValues = z.infer<typeof brandingSchema>;

export default function SettingsPage() {
  const { data, isLoading } = useOrganization();
  const updateOrganization = useUpdateOrganization();
  const updateLogo = useUpdateLogo();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<BrandingFormValues>({ resolver: zodResolver(brandingSchema) });

  const org = data?.data;

  // Populate the form once the organization loads — react-hook-form's
  // defaultValues can't be async, so this syncs in after the fetch resolves.
  useEffect(() => {
    if (org) {
      reset({
        name: org.name,
        contactEmail: org.contactEmail,
        contactPhone: org.contactPhone ?? "",
        address: org.address ?? "",
        primaryColor: org.primaryColor ?? "#2563EB",
      });
    }
  }, [org, reset]);

  const previewColor = watch("primaryColor") || "#2563EB";

  async function onSubmit(values: BrandingFormValues) {
    try {
      await updateOrganization.mutateAsync({
        name: values.name,
        contactEmail: values.contactEmail,
        contactPhone: values.contactPhone || null,
        address: values.address || null,
        primaryColor: values.primaryColor || null,
      });
      toast({ title: "Settings saved", variant: "success" });
    } catch (err) {
      toast({
        title: "Couldn't save settings",
        description: err instanceof ApiClientError ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      await updateLogo.mutateAsync(file);
      toast({ title: "Logo updated", variant: "success" });
    } catch (err) {
      toast({
        title: "Couldn't upload logo",
        description: err instanceof ApiClientError ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLogoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading settings…</p>;
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your organization's branding and contact details.</p>
      </div>

      <Link href="/dashboard/settings/roles">
        <Card className="transition-colors hover:bg-secondary/40">
          <CardContent className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-node-violet/10">
                <ShieldCheck className="h-4 w-4 text-node-violet" />
              </div>
              <div>
                <p className="font-medium">Roles & Permissions</p>
                <p className="text-xs text-muted-foreground">Control what each role can do in your organization.</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
          <CardDescription>Appears on receipts, membership cards, and the admin sidebar.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary">
            {org?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- remote org-uploaded asset, not build-time optimizable
              <img src={org.logoUrl} alt={`${org.name} logo`} className="h-full w-full object-contain" />
            ) : (
              <OrgAvatar seed={org?.id ?? "clubhub"} size={40} />
            )}
          </div>
          <div>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleLogoChange} />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={logoUploading}>
              <Upload className="h-4 w-4" />
              {logoUploading ? "Uploading…" : "Upload new logo"}
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">PNG, JPEG, WebP, or SVG. Max 5MB.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organization details</CardTitle>
          <CardDescription>This information appears on receipts and member-facing communications.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="org-name">Organization name</Label>
              <Input id="org-name" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="org-email">Contact email</Label>
              <Input id="org-email" type="email" {...register("contactEmail")} />
              {errors.contactEmail && <p className="text-xs text-destructive">{errors.contactEmail.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="org-phone">Contact phone (optional)</Label>
              <Input id="org-phone" {...register("contactPhone")} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="org-address">Address (optional)</Label>
              <Input id="org-address" {...register("address")} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="org-color">Brand color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={previewColor}
                  onChange={(e) => setValue("primaryColor", e.target.value, { shouldDirty: true })}
                  className="h-10 w-14 cursor-pointer rounded-md border border-input bg-background"
                  aria-label="Pick brand color"
                />
                <Input className="w-32 font-mono" {...register("primaryColor")} placeholder="#2563EB" />
                <span className="text-xs text-muted-foreground">Used on receipts and your membership cards.</span>
              </div>
              {errors.primaryColor && <p className="text-xs text-destructive">{errors.primaryColor.message}</p>}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting || !isDirty}>
                {isSubmitting ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
