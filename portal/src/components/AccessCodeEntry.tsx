'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Shield, FileText } from 'lucide-react';

interface AccessCodeEntryProps {
  reportId: string;
  onVerify: (code: string) => Promise<void>;
  initialError?: string;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const LOCKOUT_MS = LOCKOUT_MINUTES * 60 * 1000;

export function AccessCodeEntry({ reportId, onVerify, initialError = '' }: AccessCodeEntryProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Load persisted lockout state
  useEffect(() => {
    const key = `inspectly_lockout_${reportId}`;
    const stored = sessionStorage.getItem(key);
    if (stored) {
      const until = parseInt(stored, 10);
      if (Date.now() < until) {
        setLockedUntil(until);
      } else {
        sessionStorage.removeItem(key);
      }
    }
    inputRef.current?.focus();
  }, [reportId]);

  // Sync external error
  useEffect(() => {
    if (initialError) setError(initialError);
  }, [initialError]);

  // Countdown timer
  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const remaining = lockedUntil - Date.now();
      if (remaining <= 0) {
        setLockedUntil(null);
        setAttempts(0);
        setCountdown('');
        sessionStorage.removeItem(`inspectly_lockout_${reportId}`);
        return;
      }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil, reportId]);

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCode(val);
    setError('');
    if (val.length === 6 && !isLocked) {
      submit(val);
    }
  }

  async function submit(codeToSubmit: string = code) {
    if (isLocked || loading || codeToSubmit.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      await onVerify(codeToSubmit);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_MS;
        setLockedUntil(until);
        sessionStorage.setItem(`inspectly_lockout_${reportId}`, String(until));
        setError('');
      } else {
        setError(msg);
      }
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') submit();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/5 flex flex-col">
      {/* Header */}
      <header className="py-6 px-4 text-center">
        <div className="inline-flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground tracking-tight">Inspectly</span>
        </div>
      </header>

      {/* Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-lg shadow-lg border border-border p-8">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary" />
              </div>
            </div>

            {/* Heading */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-heading font-700 text-foreground mb-2">Enter your access code</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Check your email or text message for your 6-character access code.
              </p>
            </div>

            {/* Lockout state */}
            {isLocked ? (
              <div className="text-center">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                  <p className="text-red-700 font-semibold mb-1">Too many failed attempts</p>
                  <p className="text-red-600 text-sm mb-3">
                    Please try again in {LOCKOUT_MINUTES} minutes.
                  </p>
                  {countdown && (
                    <div className="text-3xl font-mono font-bold text-red-700">{countdown}</div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Code Input */}
                <div className="mb-4">
                  <label htmlFor="access-code" className="block text-sm font-medium text-secondary-foreground mb-2 text-center">
                    Access Code
                  </label>
                  <input
                    ref={inputRef}
                    id="access-code"
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    value={code}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    placeholder="XXXXXX"
                    maxLength={6}
                    className="w-full text-center text-3xl font-mono tracking-[0.5em] font-bold text-foreground border-2 border-border rounded-lg px-4 py-4 outline-none transition-all focus:border-ring focus:ring-4 focus:ring-ring/20 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted placeholder:tracking-[0.5em]"
                  />
                  {/* Character counter dots */}
                  <div className="flex justify-center gap-2 mt-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-all ${
                          i < code.length ? 'bg-accent scale-125' : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-700 text-center">
                    {error}
                    {attempts > 0 && attempts < MAX_ATTEMPTS && (
                      <span className="block text-xs text-red-500 mt-1">
                        {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts !== 1 ? 's' : ''} remaining
                      </span>
                    )}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  onClick={() => submit()}
                  disabled={loading || code.length !== 6}
                  className="w-full py-3.5 px-6 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-semibold rounded-lg transition-all focus:outline-none focus:ring-4 focus:ring-ring/20 active:scale-[0.99]"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    'View Report'
                  )}
                </button>
              </>
            )}

            {/* Help Section */}
            <div className="mt-6 border-t border-border pt-5">
              <button
                onClick={() => setHelpOpen(!helpOpen)}
                className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>Didn&apos;t receive a code?</span>
                {helpOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {helpOpen && (
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <div className="bg-muted/50 rounded-md p-4 space-y-2">
                    <p className="font-medium text-secondary-foreground">Check the following:</p>
                    <ul className="space-y-1.5 list-none">
                      <li className="flex items-start gap-2">
                        <span className="text-accent mt-0.5">•</span>
                        <span>Check your spam or junk mail folder</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-accent mt-0.5">•</span>
                        <span>Look for a text message from your inspector</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-accent mt-0.5">•</span>
                        <span>The code is 6 characters (letters and numbers)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-accent mt-0.5">•</span>
                        <span>Codes expire after 30 days</span>
                      </li>
                    </ul>
                  </div>
                  <p className="text-muted-foreground text-xs text-center">
                    Still having trouble? Contact your home inspector directly.
                  </p>
                </div>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Your report is protected with end-to-end access control.
          </p>
        </div>
      </main>
    </div>
  );
}
