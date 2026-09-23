"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, CalendarCheck, CreditCard, IdCard, ArrowRight, Check, Mail, MapPin as MapPinIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { HeroCarousel } from "@/components/hero-carousel";
import { EventsCarousel } from "@/components/events-carousel";

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
    description: "Every member gets a card in their pocket — always up to date, always with them.",
  },
];

const plans = [
  { name: "Trial", tagline: "Try ClubHub free", highlight: false },
  { name: "Monthly", tagline: "Pay as you go", highlight: true },
  { name: "Annual", tagline: "Best value for established clubs", highlight: false },
];

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Plans", href: "#plans" },
    { label: "Sign up", href: "/signup" },
    { label: "Log in", href: "/login" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Contact", href: "#" },
  ],
  Legal: [
    { label: "Privacy policy", href: "#" },
    { label: "Terms of service", href: "#" },
  ],
};

function formatEventDate(iso: string) {
  return new Intl.DateTimeFormat("en-GH",
    {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
}

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { data: publicEvents } = usePublicEvents();

  useEffect(() => {
    if (!isLoading && user) router.replace("/dashboard");
  }, [isLoading, user, router]);

  if (isLoading || user) return null;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4 sm:px-10">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <span className="font-display text-lg font-semibold">ClubHub</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground sm:flex">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#plans" className="hover:text-foreground">Plans</a>
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

      {/* Hero, with the rotating carousel as its background */}
      <section className="relative flex min-h-[520px] flex-col items-center justify-center gap-6 overflow-hidden px-6 py-24 text-center sm:px-10">
        <HeroCarousel />
        <Badge variant="info">Built for clubs, associations, and alumni groups</Badge>
        <h1 className="font-display max-w-2xl text-4xl font-semibold text-white sm:text-5xl">
          One Platform. Every Club. Unlimited Possibilities.
        </h1>
        <p className="max-w-xl text-lg text-white/85">
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
            <Button size="lg" variant="outline" className="border-white/40 bg-white/5 text-white hover:bg-white/10">
              Log in
            </Button>
          </Link>
        </div>
      </section>

      {/* Public events — horizontal carousel, right beneath the hero. Renders
          nothing if no orgs currently have public events, so the page never
          shows an awkward empty section. */}
      <EventsCarousel />

      {/* Features */}
      <section id="features" className="grid grid-cols-1 gap-4 px-6 py-16 sm:grid-cols-2 sm:px-10 lg:grid-cols-4">
        {features.map((f) => (
          <Card key={f.title} className="transition-shadow duration-200 hover:shadow-md">
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

      {/* Two-sided value section: bold headline + copy on one side, a
          self-contained on-brand "dashboard preview" mockup on the other
          (built with existing icons/tokens — no external image asset). */}
      <section className="grid grid-cols-1 items-center gap-10 px-6 py-20 sm:px-10 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-5">
          <Badge variant="info" className="w-fit">Why clubs switch to ClubHub</Badge>
          <h2 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
            Stop running your club out of spreadsheets and group chats.
          </h2>
          <p className="text-muted-foreground">
            Members, dues, events, and projects scattered across WhatsApp, Excel, and someone's
            notebook is how things get missed. ClubHub brings it into one place your whole
            committee can actually rely on, whatever role you hold.
          </p>
          <ul className="flex flex-col gap-3 text-sm">
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-node-emerald" />
              Know exactly who's paid dues and who hasn't, in real time
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-node-emerald" />
              Every member gets a digital card and a QR check-in at events
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-node-emerald" />
              Built for the way clubs actually run. Rotary, Rotaract, Churches, Alumni bodies, and more...
            </li>
          </ul>
          <div>
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                Start free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-brand-gradient opacity-20 blur-3xl" />
          <div className="glass w-full max-w-md rounded-2xl border border-border/60 p-6 shadow-xl">
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <Logo className="h-6 w-6" />
              <span className="font-display text-sm font-semibold">Rotary Club of Accra</span>
            </div>
            <div className="flex flex-col gap-3 pt-4">
              <div className="flex items-center justify-between rounded-lg bg-secondary/60 p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-node-emerald/10 text-node-emerald">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">Dues collected</p>
                    <p className="text-[10px] text-muted-foreground">This month</p>
                  </div>
                </div>
                <p className="font-mono text-sm font-semibold">GHS 4,250</p>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-secondary/60 p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-node-cyan/10 text-node-cyan">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">Active members</p>
                    <p className="text-[10px] text-muted-foreground">+3 this week</p>
                  </div>
                </div>
                <p className="font-mono text-sm font-semibold">128</p>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-secondary/60 p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-node-violet/10 text-node-violet">
                    <CalendarCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">Next event</p>
                    <p className="text-[10px] text-muted-foreground">Sat, Feb 14</p>
                  </div>
                </div>
                <p className="text-xs font-medium text-node-violet">42 registered</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Plans */}
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

      {/* Closing CTA */}
      <section className="px-6 py-16 sm:px-10">
        <div className="glass mx-auto flex max-w-4xl flex-col items-center gap-4 rounded-3xl border border-border/60 px-8 py-12 text-center shadow-xl">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">Bring your Club to the digital age.</h2>
          <p className="max-w-lg text-muted-foreground">
            Start on the free trial plan. No card required. Invite your committee, add your
            first event, and see it click.
          </p>
          <Link href="/signup">
            <Button size="lg" className="gap-2">
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-secondary/40 px-6 py-12 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="flex flex-col gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Logo className="h-7 w-7" />
              <span className="font-display font-semibold">ClubHub</span>
            </Link>
            <p className="max-w-xs text-sm text-muted-foreground">
              One Platform. Every Club. Unlimited Possibilities.
            </p>
            <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" /> info@clubhub.ghana
              </span>
              <span className="flex items-center gap-2">
                <MapPinIcon className="h-3.5 w-3.5" /> Accra, Ghana
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {Object.entries(footerLinks).map(([section, links]) => (
              <div key={section} className="flex flex-col gap-2">
                <p className="font-display text-sm font-semibold">{section}</p>
                {links.map((link) => (
                  <Link key={link.label} href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-6xl border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} ClubHub - All rights reserved.
        </div>
      </footer>
    </div>
  );
}