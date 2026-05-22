'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Camera,
  CheckSquare,
  Send,
  Users,
  Globe,
  Menu,
  X,
  ArrowRight,
  Check,
  FileText,
  ClipboardList,
  PenLine,
  Clock,
  AlertTriangle,
  Zap,
  Shield,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Navigation                                                         */
/* ------------------------------------------------------------------ */

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-primary/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <span className="font-heading text-xl font-bold text-primary-foreground">
              Inspectly
            </span>
          </Link>

          <div className="hidden md:flex md:items-center md:gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-primary-foreground/70 transition-colors hover:text-accent"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex md:items-center md:gap-3">
            <Link
              href="/login"
              className="rounded-md px-4 py-2 text-sm font-medium text-primary-foreground/80 transition-colors hover:text-primary-foreground"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-sm transition-all hover:brightness-110"
            >
              Get Started
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="inline-flex items-center justify-center rounded-md p-2 text-primary-foreground/70 transition-colors hover:text-primary-foreground md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-primary-foreground/10 bg-primary md:hidden">
          <div className="space-y-1 px-4 py-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-md px-3 py-2 text-sm font-medium text-primary-foreground/70 transition-colors hover:text-primary-foreground"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-primary-foreground/10 pt-3">
              <Link
                href="/login"
                className="rounded-md px-3 py-2 text-center text-sm font-medium text-primary-foreground/80"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-accent px-3 py-2 text-center text-sm font-semibold text-accent-foreground"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Split Hero — The Old Way vs The New Way                            */
/* ------------------------------------------------------------------ */

function SplitHero() {
  return (
    <section className="relative pt-16">
      {/* Mobile: stacked, Desktop: side-by-side */}
      <div className="grid min-h-[85vh] lg:grid-cols-2">
        {/* LEFT — The Old Way (desaturated, muted) */}
        <div className="relative flex items-center bg-muted px-6 py-16 sm:px-12 lg:py-24">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-[0.07]"
            style={{ backgroundImage: "url('/images/paperwork.jpg')" }}
          />
          <div className="relative max-w-lg">
            <span className="inline-block rounded-sm bg-muted-foreground/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              The old way
            </span>
            <h2 className="mt-4 font-heading text-3xl font-700 leading-tight text-foreground/60 sm:text-4xl">
              Paper clipboards.<br />
              Handwritten notes.<br />
              Hours assembling reports.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Illegible field notes, photos scattered across your camera roll, and late nights
              typing up reports that should have been done on-site.
            </p>
            <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground/80">
              <Clock className="h-4 w-4" />
              <span>3-4 hours per report, manually</span>
            </div>
          </div>
        </div>

        {/* RIGHT — With Inspectly (warm, vibrant) */}
        <div className="relative flex items-center bg-primary px-6 py-16 sm:px-12 lg:py-24">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-[0.12]"
            style={{ backgroundImage: "url('/images/hero-house.jpg')" }}
          />
          <div className="hero-orchestrate relative max-w-lg">
            <span className="inline-block rounded-sm bg-accent/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent">
              With Inspectly
            </span>
            <h1 className="mt-4 font-heading text-3xl font-700 leading-tight text-primary-foreground sm:text-4xl lg:text-5xl">
              Professional reports,<br />
              finished on-site.<br />
              <span className="text-accent">Delivered instantly.</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-primary-foreground/80">
              AI-powered narratives, integrated photo documentation, and one-tap publishing.
              Your clients get a polished report before you leave the driveway.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/signup"
                className="btn-interactive inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-base font-semibold text-accent-foreground shadow-md transition-all hover:brightness-110"
              >
                Start Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-6 flex items-center gap-3 text-sm text-accent/90">
              <Zap className="h-4 w-4" />
              <span>Reports done in under 30 minutes</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Paired Comparisons — Before/After Feature Blocks                   */
/* ------------------------------------------------------------------ */

const comparisons = [
  {
    old: {
      icon: PenLine,
      title: 'Handwritten field notes',
      desc: 'Scribbling on paper in the field, then deciphering your own handwriting at the office to type up findings.',
    },
    new: {
      icon: Sparkles,
      title: 'AI-generated narratives',
      desc: 'Tap a finding, snap a photo — Inspectly generates clear, professional descriptions using AI that understands inspection context.',
    },
  },
  {
    old: {
      icon: Camera,
      title: 'Photos scattered everywhere',
      desc: 'Camera roll mixed with personal photos. Manually renaming, sorting, and inserting images into Word documents.',
    },
    new: {
      icon: Camera,
      title: 'Integrated photo documentation',
      desc: 'Capture and annotate photos directly within each finding. Every image is organized, labeled, and embedded in the report automatically.',
    },
  },
  {
    old: {
      icon: FileText,
      title: 'Manual report assembly',
      desc: 'Copy-pasting from templates, formatting tables, exporting to PDF, then emailing it and hoping the client opens it.',
    },
    new: {
      icon: Send,
      title: 'One-tap publish and share',
      desc: 'Generate a polished, interactive report and share it with a secure access code. Clients view it on any device, instantly.',
    },
  },
  {
    old: {
      icon: ClipboardList,
      title: 'Solo operation, no standards',
      desc: 'Every inspector does things differently. No consistent templates, no shared quality standards across your team.',
    },
    new: {
      icon: Users,
      title: 'Team management and firm templates',
      desc: 'Create a firm, invite inspectors, and standardize checklist templates. Everyone follows the same professional process.',
    },
  },
];

function PairedComparisons() {
  return (
    <section id="features" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="reveal mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-700 text-foreground sm:text-4xl">
            Every pain point, solved
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            See how Inspectly transforms every step of the inspection workflow.
          </p>
        </div>

        <div className="mt-16 space-y-12 lg:space-y-16">
          {comparisons.map((pair, idx) => {
            const OldIcon = pair.old.icon;
            const NewIcon = pair.new.icon;
            const reverse = idx % 2 === 1;

            return (
              <div
                key={idx}
                className={`grid items-stretch gap-4 lg:grid-cols-2 lg:gap-6 ${
                  reverse ? 'lg:direction-rtl' : ''
                }`}
              >
                {/* Old Way Card */}
                <div
                  className={`reveal card-interactive rounded-lg border border-border bg-muted/50 p-6 sm:p-8 ${
                    reverse ? 'lg:order-2' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                      <OldIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                        Before
                      </span>
                      <h3 className="mt-1 font-heading text-lg font-600 text-foreground/70">
                        {pair.old.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {pair.old.desc}
                      </p>
                    </div>
                  </div>
                </div>

                {/* New Way Card */}
                <div
                  className={`reveal card-interactive rounded-lg border border-accent/30 bg-card p-6 shadow-sm sm:p-8 ${
                    reverse ? 'lg:order-1' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/15">
                      <NewIcon className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                        With Inspectly
                      </span>
                      <h3 className="mt-1 font-heading text-lg font-600 text-foreground">
                        {pair.new.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {pair.new.desc}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Stats with Delta Indicators                                        */
/* ------------------------------------------------------------------ */

function StatsSection() {
  const stats = [
    { value: '6x', label: 'Faster report delivery', detail: 'vs. manual process' },
    { value: '100%', label: 'Digital documentation', detail: 'no more paper trails' },
    { value: '<30', label: 'Minutes per report', detail: 'from walk-through to send' },
    { value: '4.9/5', label: 'Inspector satisfaction', detail: 'across all users' },
  ];

  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/property-exterior.jpg')" }}
      />
      <div className="absolute inset-0 bg-primary/90" />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="reveal-stagger grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-12">
          {stats.map((s) => (
            <div key={s.label} className="reveal text-center">
              <p className="font-heading text-4xl font-700 text-accent sm:text-5xl">{s.value}</p>
              <p className="mt-2 text-sm font-semibold text-primary-foreground">{s.label}</p>
              <p className="mt-0.5 text-xs text-primary-foreground/50">{s.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Social Proof — Trust Strip                                         */
/* ------------------------------------------------------------------ */

function TrustSection() {
  return (
    <section className="border-y border-border bg-card py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-medium text-muted-foreground">
          Trusted by inspection professionals across the country
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {['ASHI Certified', 'InterNACHI Members', 'State Licensed', 'E&O Insured'].map(
            (badge) => (
              <span
                key={badge}
                className="text-sm font-semibold tracking-wide text-muted-foreground/60"
              >
                {badge}
              </span>
            )
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Pricing                                                            */
/* ------------------------------------------------------------------ */

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'For individual inspectors getting started',
    features: [
      'Up to 5 inspections per month',
      'Standard checklist templates',
      'AI-generated narratives',
      'Email report delivery',
      'Photo documentation',
    ],
    cta: 'Start Free',
    href: '/signup',
    featured: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'For professionals and growing teams',
    features: [
      'Unlimited inspections',
      'Custom checklist templates',
      'Custom branding and logo',
      'Team management and firm accounts',
      'Priority support',
      'Advanced analytics',
    ],
    cta: 'Start Pro Trial',
    href: '/signup',
    featured: true,
  },
];

function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 bg-muted/40 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="reveal mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-700 text-foreground sm:text-4xl">
            Simple, honest pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start free. Upgrade when your business grows. No hidden fees.
          </p>
        </div>
        <div className="reveal-stagger mt-16 grid gap-6 md:grid-cols-2 lg:mx-auto lg:max-w-4xl">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`reveal card-interactive relative flex flex-col rounded-lg border p-8 ${
                plan.featured
                  ? 'border-accent bg-card shadow-md'
                  : 'border-border bg-card'
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-xs font-semibold text-accent-foreground">
                  Most Popular
                </span>
              )}
              <div className="mb-6">
                <h3 className="font-heading text-xl font-600 text-foreground">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              </div>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="font-heading text-4xl font-700 text-foreground">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span className="text-sm text-foreground/80">{feat}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={`btn-interactive block w-full rounded-md py-3 text-center text-sm font-semibold transition-all ${
                  plan.featured
                    ? 'bg-accent text-accent-foreground shadow-sm hover:brightness-110'
                    : 'border border-border bg-card text-foreground hover:border-accent hover:shadow-sm'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  CTA — Make the Switch                                              */
/* ------------------------------------------------------------------ */

function CallToAction() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/inspector-tablet.jpg')" }}
      />
      <div className="absolute inset-0 bg-primary/92" />
      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="reveal mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-700 text-primary-foreground sm:text-4xl">
            Ready to leave the clipboard behind?
          </h2>
          <p className="mt-4 text-lg text-primary-foreground/70">
            Join hundreds of inspectors who finish reports on-site instead of at midnight.
            Get started in under two minutes — no credit card required.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/signup"
              className="btn-interactive inline-flex items-center gap-2 rounded-md bg-accent px-8 py-3.5 text-base font-semibold text-accent-foreground shadow-md transition-all hover:brightness-110"
            >
              Start Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Footer                                                             */
/* ------------------------------------------------------------------ */

const footerLinks = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Mobile App', href: '#' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Contact', href: '#' },
    { label: 'Blog', href: '#' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
  ],
};

function Footer() {
  return (
    <footer className="bg-primary pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <span className="font-heading text-xl font-bold text-primary-foreground">
                Inspectly
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-primary-foreground/50">
              Professional home inspection reports made simple. AI-powered narratives,
              photo documentation, and instant client delivery.
            </p>
          </div>
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/40">
                {heading}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-primary-foreground/60 transition-colors hover:text-accent"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-primary-foreground/10 pt-8">
          <p className="text-center text-sm text-primary-foreground/30">
            &copy; {new Date().getFullYear()} Inspectly. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function Home() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Navbar />
      <main>
        <SplitHero />
        <TrustSection />
        <PairedComparisons />
        <StatsSection />
        <Pricing />
        <CallToAction />
      </main>
      <Footer />
    </>
  );
}
