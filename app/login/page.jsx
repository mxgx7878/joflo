'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { useStore, useCurrentUser, useStoreReady } from '@/lib/store';
import { DEMO_ACCOUNTS } from '@/lib/seed';
import { MinimalHeader } from '@/components/account/shared';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next');
  const ready = useStoreReady();
  const user = useCurrentUser();
  const login = useStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // `next` is only honoured when the signed-in role may open it (prevents /admin <-> /login loops)
  const allowed = (u, n) => !!n && n.startsWith('/') && !(n.startsWith('/admin') && u.role !== 'admin') && !(n.startsWith('/vendor') && u.role !== 'vendor') && !(/^\/(account|checkout)/.test(n) && u.role !== 'customer');
  const home = (u) => (u.role === 'admin' ? '/admin' : u.role === 'vendor' ? '/vendor' : '/account');
  const dest = (u) => (allowed(u, next) ? next : home(u));
  const wrongRole = ready && user && next && !allowed(user, next);

  // Already signed in → skip the form (unless they need a different account for `next`)
  useEffect(() => { if (ready && user && !busy && !wrongRole) router.replace(dest(user)); }, [ready, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return; }
    setBusy(true);
    const r = await login(email, password);
    if (!r.ok) { setError(r.error); setBusy(false); return; }
    router.push(dest(r.user));
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {wrongRole && (
        <p className="rounded-xl bg-gold-pale text-[13px] text-navy px-4 py-3 leading-relaxed">
          You&apos;re signed in as <b>{user.name}</b>. That page needs {next.startsWith('/admin') ? 'an admin' : next.startsWith('/vendor') ? 'a supplier' : 'a customer'} account — sign in below to switch.
        </p>
      )}
      <div className="field">
        <label htmlFor="email">Email address</label>
        <div className="relative">
          <Mail className="w-[18px] h-[18px] text-navy/40 absolute left-4 top-1/2 -translate-y-1/2" />
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} className="!pl-11" placeholder="you@business.com" />
        </div>
      </div>
      <div className="field">
        <div className="flex items-center justify-between">
          <label htmlFor="password">Password</label>
          <button type="button" className="text-[11.5px] font-bold text-emerald hover:text-navy -mt-1.5" onClick={() => setError('Password reset by email is coming soon — contact JOLOF TRADING to reset your password.')}>Forgot password?</button>
        </div>
        <div className="relative">
          <LockKeyhole className="w-[18px] h-[18px] text-navy/40 absolute left-4 top-1/2 -translate-y-1/2" />
          <input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} className="!pl-11 !pr-12" placeholder="••••••••" />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center text-navy/50 hover:text-navy" aria-label={show ? 'Hide password' : 'Show password'}>
            {show ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
          </button>
        </div>
      </div>

      {error && <p role="alert" className="text-[13px] font-semibold text-[#B4432F] bg-[#F8E7E3] rounded-xl px-4 py-3">{error}</p>}

      <button type="submit" disabled={busy} className="btn btn-navy w-full">{busy ? 'Signing in…' : 'Sign in'} <ArrowRight className="mv" /></button>

      <div className="pt-2">
        <p className="text-[10.5px] font-extrabold tracking-[.2em] uppercase text-charcoal/45 mb-2.5">Use a demo account</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {DEMO_ACCOUNTS.map((a) => (
            <button key={a.email} type="button" onClick={() => { setEmail(a.email); setPassword(a.password); setError(''); }}
              className={`rounded-xl border-[1.5px] px-2 py-2.5 text-center transition ${email === a.email ? 'border-gold bg-gold-pale' : 'border-[#E2DED2] hover:border-navy/40'}`}>
              <span className="block text-[12.5px] font-extrabold text-navy">{a.label}</span>
              <span className="block text-[10.5px] text-charcoal/50 truncate">{a.email.split('@')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="text-center text-[13.5px] text-charcoal/60 pt-1">
        New to JOLOF TRADING? <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-bold text-emerald hover:text-navy">Create an account</Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-ivory flex flex-col">
      <MinimalHeader />
      <main className="flex-1 grid lg:grid-cols-2">
        <div className="hidden lg:block relative overflow-hidden bg-navy">
          <img src="https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=1200&q=78" alt="Container terminal with stacked shipping containers" className="absolute inset-0 w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/60 to-navy-950/20" />
          <div className="relative h-full flex flex-col justify-end p-14 text-white max-w-[560px]">
            <p className="kicker !text-gold-soft">Trade account</p>
            <h2 className="h-display text-[2.6rem] mt-4">Wholesale ordering, <em className="text-gold-soft">made simple.</em></h2>
            <ul className="mt-6 space-y-2.5 text-white/80 text-[15px]">
              <li>✦ Track orders from confirmation to delivery</li>
              <li>✦ Request and accept bulk quotes online</li>
              <li>✦ Commodity trading quotes — FOB, CIF & more</li>
            </ul>
          </div>
        </div>
        <div className="flex items-center justify-center px-4 py-10 sm:py-14">
          <div className="w-full max-w-[440px] bg-white rounded-3xl border border-navy/5 shadow-[0_30px_70px_-40px_rgba(11,35,71,.45)] p-6 sm:p-9">
            <p className="kicker">Welcome back</p>
            <h1 className="h-display text-navy text-[2.1rem] mt-3">Sign in</h1>
            <p className="text-[14px] text-charcoal/60 mt-2 mb-7">Access your orders, quotes and saved items.</p>
            <Suspense fallback={<div className="h-80" />}><LoginForm /></Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
