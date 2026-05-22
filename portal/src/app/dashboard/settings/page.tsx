'use client';

import { useAuth } from '@/lib/auth';
import { User, Mail, CreditCard, Building2, Shield, LogOut } from 'lucide-react';

export default function SettingsPage() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="font-heading text-2xl font-700 text-foreground">Settings</h1>

      {/* Profile */}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-heading text-lg font-600 text-foreground">Profile</h2>
        </div>
        <div className="space-y-4 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-lg font-bold text-accent">
              {user.displayName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{user.displayName}</p>
              <span className="inline-block rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent capitalize">
                {user.role?.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <div className="mt-1 flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-foreground">{user.email}</p>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">License Number</label>
              <div className="mt-1 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-foreground">{user.licenseNumber || 'Not set'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Firm */}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-heading text-lg font-600 text-foreground">Firm</h2>
        </div>
        <div className="p-6">
          {user.firmId ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Member of a firm</p>
                <p className="text-xs text-muted-foreground">Firm ID: {user.firmId}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <Building2 className="mx-auto h-10 w-10 text-muted" />
              <p className="mt-2 text-sm text-muted-foreground">You are not part of a firm.</p>
              <p className="mt-1 text-xs text-muted-foreground">Create or join a firm from the mobile app.</p>
            </div>
          )}
        </div>
      </div>

      {/* Account */}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-heading text-lg font-600 text-foreground">Account</h2>
        </div>
        <div className="p-6">
          <button
            onClick={signOut}
            className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/15"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
