"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Bell, Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useOrganization } from "@/hooks/use-organization";
import { OrgAvatar } from "@/components/org-avatar";
import { SidebarNav } from "@/components/sidebar-nav";
import { Button } from "@/components/ui/button";

function SidebarHeader({ logoUrl, orgName, orgId }: { logoUrl: string | null | undefined; orgName: string | undefined; orgId: string | undefined }) {
  return (
    <div className="mb-8 flex items-center gap-3 px-4">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote org-uploaded asset, not build-time optimizable
        <img src={logoUrl} alt={`${orgName ?? "Organization"} logo`} className="h-9 w-9 rounded-md object-contain" />
      ) : (
        <OrgAvatar seed={orgId ?? "clubhub"} />
      )}
      <div className="min-w-0">
        <p className="truncate font-display text-sm font-semibold">{orgName ?? "ClubHub"}</p>
        <p className="truncate text-xs text-muted-foreground">Admin Portal</p>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, organization, isLoading, logout } = useAuth();
  const { data: orgDetail } = useOrganization(); // fetched separately — carries logoUrl, which the auth session payload doesn't
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  // Close the mobile drawer automatically whenever the route changes —
  // otherwise tapping a nav link would leave the drawer open over the new page.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <OrgAvatar seed="clubhub" size={40} className="animate-pulse" />
      </div>
    );
  }

  if (!user) return null; // redirect effect above is already firing

  const logoUrl = orgDetail?.data.logoUrl;

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar — unchanged from before, still hidden below md */}
      <aside className="glass sticky top-0 hidden h-screen w-64 flex-col border-r border-border/60 py-6 md:flex">
        <SidebarHeader logoUrl={logoUrl} orgName={organization?.name} orgId={organization?.id} />
        <SidebarNav />
      </aside>

      {/* Mobile drawer — slides in from the left, dismissible via overlay tap,
          close button, or navigating (handled by the pathname effect above). */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden"
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.2 }}
              className="glass fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border/60 py-6 md:hidden"
            >
              <div className="flex items-center justify-between px-4">
                <div className="flex-1">
                  <SidebarHeader logoUrl={logoUrl} orgName={organization?.name} orgId={organization?.id} />
                </div>
                <Button variant="ghost" size="icon" aria-label="Close menu" onClick={() => setMobileNavOpen(false)} className="mb-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <SidebarNav />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open menu"
            className="md:hidden"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden md:block" />
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell className="h-4 w-4" />
            </Button>
            <div className="hidden items-center gap-2 text-sm sm:flex">
              <span className="font-medium">
                {user.firstName} {user.lastName}
              </span>
            </div>
            <Button variant="ghost" size="icon" aria-label="Log out" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
