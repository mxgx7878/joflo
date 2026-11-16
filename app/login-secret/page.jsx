'use client';
import LoginView from '@/components/account/LoginView';
import { DEMO_ACCOUNTS } from '@/lib/seed';

// Internal sign-in with one-click demo accounts. Not linked anywhere on the site.
export default function LoginSecretPage() {
  return <LoginView demoAccounts={DEMO_ACCOUNTS} />;
}
