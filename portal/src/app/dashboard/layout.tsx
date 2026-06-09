'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ToastProvider, useToast } from '@/components/ux/Toast';
import { TourProvider } from '@/components/ux/TourProvider';
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  ListChecks,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
  Loader2,
  ChevronDown,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, tourId: 'dashboard' },
  { label: 'Inspections', href: '/dashboard/inspections', icon: ClipboardList, tourId: 'inspections' },
  { label: 'Reports', href: '/dashboard/reports', icon: FileText, tourId: 'reports' },
  { label: 'Templates', href: '/dashboard/templates', icon: ListChecks, tourId: 'templates' },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings, tourId: 'settings' },
];

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, authState, signOut } = useAuth();
  const { toast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (authState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (authState === 'needs_onboarding' || authState === 'unverified') {
    if (typeof window !== 'undefined') router.replace('/onboarding');
    return null;
  }

  if (authState !== 'authenticated') {
    if (typeof window !== 'undefined') router.replace('/login');
    return null;
  }

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname?.startsWith(href));

  const initials = user?.displayName
    ? user.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Rail */}
      <header className="sticky top-0 z-40 border-b border-primary/10 bg-primary shadow-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 lg:px-8">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent">
              <Shield className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="font-heading text-lg font-bold text-primary-foreground">
              Inspectly
            </span>
          </Link>

          {/* Desktop Nav — Segmented Tabs */}
          <nav className="ml-8 hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-tour={item.tourId}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary-foreground/15 text-primary-foreground'
                      : 'text-primary-foreground/50 hover:bg-primary-foreground/10 hover:text-primary-foreground/80'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex-1" />

          {/* User Menu */}
          <div ref={userMenuRef} className="relative hidden md:block">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-primary-foreground/10"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">
                {initials}
              </div>
              <span className="max-w-[120px] truncate text-primary-foreground/80">
                {user?.displayName?.split(' ')[0]}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-primary-foreground/40" />
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-border bg-card p-1 shadow-lg animate-fade-in">
                <div className="border-b border-border px-3 py-2.5">
                  <p className="truncate text-sm font-medium text-foreground">
                    {user?.displayName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    setShowSignOutConfirm(true);
                  }}
                  className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-md p-1.5 text-primary-foreground/60 hover:bg-primary-foreground/10 md:hidden"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <div className="border-t border-primary-foreground/10 bg-primary px-4 pb-4 pt-2 md:hidden animate-fade-in">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-primary-foreground/15 text-primary-foreground'
                        : 'text-primary-foreground/50 hover:bg-primary-foreground/10 hover:text-primary-foreground/80'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-3 border-t border-primary-foreground/10 pt-3">
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-primary-foreground">
                    {user?.displayName}
                  </p>
                  <p className="truncate text-xs text-primary-foreground/40">
                    {user?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowSignOutConfirm(true);
                }}
                className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-primary-foreground/60 transition-colors hover:bg-primary-foreground/10"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Page Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8 lg:py-8">
        {children}
      </main>

      {/* Sign Out Confirmation */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-foreground/50" onClick={() => setShowSignOutConfirm(false)} />
          <div className="relative w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-xl animate-slide-up">
            <h3 className="font-heading text-lg font-600 text-foreground">Sign out?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              You&apos;ll need to sign in again to access your dashboard.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="rounded-md px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowSignOutConfirm(false);
                  toast('Signed out successfully');
                  signOut();
                }}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <TourProvider>
          <DashboardShell>{children}</DashboardShell>
        </TourProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
