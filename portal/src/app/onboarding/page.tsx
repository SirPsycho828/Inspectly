'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AuthProvider, useAuth } from '@/lib/auth';
import { Shield, Loader2, ChevronRight, ChevronLeft, Smartphone, Download, Check, Sparkles, User } from 'lucide-react';

const TOTAL_STEPS = 4;

function SetupWizard() {
  const { firebaseUser, authState } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authState === 'authenticated') router.replace('/dashboard');
    if (authState === 'unauthenticated') router.replace('/login');
  }, [authState, router]);

  useEffect(() => {
    if (firebaseUser?.displayName) {
      setDisplayName(firebaseUser.displayName);
    }
  }, [firebaseUser]);

  if (authState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (authState === 'authenticated' || authState === 'unauthenticated') return null;

  async function handleComplete() {
    if (!firebaseUser) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        displayName: displayName.trim() || firebaseUser.displayName || 'Inspector',
        email: firebaseUser.email,
        role: 'inspector',
        firmId: null,
        licenseNumber: '',
        profilePhotoUrl: firebaseUser.photoURL || null,
        onboardingComplete: true,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      localStorage.setItem('inspectly-tour-pending', 'true');
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Onboarding save error:', err);
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <Shield className="h-4 w-4 text-accent" />
            </div>
            <span className="font-heading text-lg font-bold text-foreground">Inspectly</span>
          </div>
          <button
            onClick={handleComplete}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip setup
          </button>
        </div>
      </header>

      {/* Progress */}
      <div className="mx-auto w-full max-w-2xl px-6 pt-8">
        <div className="flex items-center gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-accent' : 'bg-border'
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Step {step + 1} of {TOTAL_STEPS}</p>
      </div>

      {/* Step Content */}
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
        <div key={step} className="animate-slide-up">
          {step === 0 && (
            <div className="space-y-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
                <Sparkles className="h-8 w-8 text-accent" />
              </div>
              <h1 className="font-heading text-3xl font-700 text-foreground">Welcome to Inspectly</h1>
              <p className="text-lg leading-relaxed text-muted-foreground">
                Let&apos;s get you set up in just a minute. This quick walkthrough will help you understand how the portal works and get you ready to start.
              </p>
              <div className="space-y-3 rounded-lg border border-border bg-card p-5">
                <p className="text-sm font-medium text-foreground">Here&apos;s what we&apos;ll cover:</p>
                <ul className="space-y-2">
                  {['Set up your profile', 'Learn about the mobile app', 'Explore your dashboard'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-accent" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">Estimated time: ~1 minute</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
                <User className="h-8 w-8 text-accent" />
              </div>
              <h1 className="font-heading text-3xl font-700 text-foreground">Your Profile</h1>
              <p className="text-muted-foreground">
                Confirm your name as it should appear on inspection reports and within your team.
              </p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="wizard-name" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Display Name
                  </label>
                  <input
                    id="wizard-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Email
                  </label>
                  <p className="rounded-md border border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
                    {firebaseUser?.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
                <Smartphone className="h-8 w-8 text-accent" />
              </div>
              <h1 className="font-heading text-3xl font-700 text-foreground">Get the Mobile App</h1>
              <p className="text-muted-foreground">
                Inspections are created and conducted from the Inspectly mobile app. This web portal is your companion for reviewing reports, sharing with clients, and managing your practice.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-card p-5 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Download className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">iOS</p>
                  <p className="mt-1 text-xs text-muted-foreground">Search &ldquo;Inspectly&rdquo; on the App Store</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-5 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Download className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Android</p>
                  <p className="mt-1 text-xs text-muted-foreground">Search &ldquo;Inspectly&rdquo; on Google Play</p>
                </div>
              </div>
              <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                <p className="text-sm text-foreground">
                  <strong>How it works:</strong> Create inspections on your phone, document findings with photos, and publish reports. They&apos;ll appear here automatically.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/15">
                <Check className="h-10 w-10 text-success" />
              </div>
              <h1 className="font-heading text-3xl font-700 text-foreground">You&apos;re All Set!</h1>
              <p className="mx-auto max-w-md text-muted-foreground">
                Your profile is ready. Next, we&apos;ll give you a quick tour of the dashboard so you know where everything is.
              </p>
              <div className="mx-auto max-w-sm space-y-2 rounded-lg border border-border bg-card p-5 text-left">
                <p className="text-sm font-medium text-foreground">What was set up:</p>
                <ul className="space-y-1.5">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-success" />
                    Profile: {displayName || 'Inspector'}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-success" />
                    Email: {firebaseUser?.email}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-success" />
                    Role: Inspector
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="border-t border-border px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:invisible"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          {step < TOTAL_STEPS - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:brightness-110"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={saving}
              className="flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:brightness-110 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Go to Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <AuthProvider>
      <SetupWizard />
    </AuthProvider>
  );
}
