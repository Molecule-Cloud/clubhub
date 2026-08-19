"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, CalendarCheck, CreditCard, IdCard, ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: Users,
    color: "text-node-cyan bg-node-cyan/10",
    title: "Membership management",
    description: "Track members, roles, and invitations in one place — no more spreadsheets.",
  },
  {
    icon: CalendarCheck,
    color: "text-node-violet bg-node-violet/10",
    title: "Events & check-ins",
    description: "Create events, take RSVPs, and check members in with a QR code at the door.",
  },
  {
    icon: CreditCard,
    color: "text-node-emerald bg-node-emerald/10",
    title: "Payments, built in",
    description: "Collect dues and event fees through Paystack, with receipts generated automatically.",
  },
  {
    icon: IdCard,
    color: "text-node-amber bg-node-amber/10",
    title: "Digital membership cards",
    description: "Every member gets a card in their pocket  always up to date, always with them.",
  },
];

const plans = [
  { name: "Trial", tagline: "Try ClubHub free", highlight: false },
  { name: "Monthly", tagline: "Pay as you go", highlight: true },
  { name: "Annual", tagline: "Best value for established clubs", highlight: false },
];

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#plans" },
  { label: "About", href: "#about-clubhub" },
];

const footerColumns = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#plans" },
      { label: "Log in", href: "/login" },
      { label: "Get started", href: "/signup" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "#about-clubhub" },
      { label: "Contact", href: "mailto:hello@clubhub.app" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of service", href: "/terms" },
    ],
  },
];

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) router.replace("/dashboard");
  }, [isLoading, user, router]);

  if (isLoading || user) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4 sm:px-10">
        <span className="font-display text-lg font-semibold">ClubHub</span>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost">Log in</Button>
          </Link>
          <Link href="/signup">
            <Button>Get started</Button>
          </Link>
        </div>
      </header>

      <section className="relative flex flex-col items-center gap-6 overflow-hidden px-6 py-24 text-center sm:px-10">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: "url('https://res.cloudinary.com/bq4xpoqm/image/upload/v1787151257/images.jpg)" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 -z-10 bg-background/85" aria-hidden="true" />

        <Badge variant="info">Built for clubs, associations, and alumni groups</Badge>
        <h1 className="font-display max-w-2xl text-4xl font-semibold sm:text-5xl">
          One Platform. Every Club. Unlimited Possibilities.
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Manage members, run events, and collect payments — all from one dashboard your whole
          organization can rely on.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/signup">
            <Button size="lg" className="gap-2">
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">
              Log in
            </Button>
          </Link>
        </div>
      </section>

      <section id="features" className="grid grid-cols-1 gap-4 px-6 py-12 sm:grid-cols-2 sm:px-10 lg:grid-cols-4">
        {features.map((f) => (
          <Card key={f.title}>
            <CardContent className="flex flex-col gap-3 p-5">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${f.color}`}>
                <f.icon className="h-5 w-5" />
              </div>
              <p className="font-display font-semibold">{f.title}</p>
              <p className="text-sm text-muted-foreground">{f.description}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section id="plans" className="flex flex-col items-center gap-8 px-6 py-20 sm:px-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">Simple, flexible plans</h2>
          <p className="text-muted-foreground">Contact us for pricing tailored to your organization.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
          {plans.map((plan) => (
            <Card key={plan.name} className={plan.highlight ? "border-primary" : undefined}>
              <CardContent className="flex w-64 flex-col gap-4 p-6">
                <div>
                  <p className="font-display text-lg font-semibold">{plan.name}</p>
                  <p className="text-sm text-muted-foreground">{plan.tagline}</p>
                </div>
                <p className="font-display text-2xl font-semibold">Contact us</p>
                <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-node-emerald" /> Membership management
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-node-emerald" /> Events & check-ins
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-node-emerald" /> Payments via Paystack
                  </li>
                </ul>
                <Link href="/signup">
                  <Button className="w-full" variant={plan.highlight ? "default" : "outline"}>
                    Get started
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="mt-auto border-t border-border px-6 py-12 sm:px-10">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 flex flex-col gap-2 sm:col-span-1" id="about-clubhub">
            <span className="font-display text-lg font-semibold">ClubHub</span>
            <p className="text-sm text-muted-foreground">
              One platform for every club, association, and alumni group.
            </p>
          </div>

          {footerColumns.map((col) => (
            <div key={col.heading} className="flex flex-col gap-2">
              <p className="font-display text-sm font-semibold">{col.heading}</p>
              <ul className="flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} ClubHub — One Platform. Every Club. Unlimited Possibilities.</p>
        </div>
      </footer>
    </div>
  );
}