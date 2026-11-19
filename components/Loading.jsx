'use client';
// Loading states used across the site:
//   <FullPageLoader />  first load of the store / a dashboard (logo + spinner)
//   <BusyOverlay />     an action is waiting on the server ("Placing your order…") — blocks clicks
//   <TopProgress />     thin bar at the top while any request is running (also background refreshes)
//   <SectionLoader />   inside a dashboard while a page's code loads
// Global ones (BusyOverlay / TopProgress) are mounted once in Providers and driven by lib/store.js.
import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';

export function Spinner({ className = 'w-10 h-10' }) {
  return <span aria-hidden="true" className={`block rounded-full border-[3px] border-gold/25 border-t-gold animate-spin ${className}`} />;
}

export function FullPageLoader({ label = 'Loading…', overlay = false, show = true }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!show}
      className={`${overlay ? 'fixed inset-0 z-[150]' : 'min-h-screen'} grid place-items-center bg-ivory transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <div className="flex flex-col items-center text-center px-6">
        <img src="/brand/logo.webp" alt="JOLOF TRADE CENTER" className="h-16 sm:h-20 w-auto" />
        <Spinner className="w-9 h-9 mt-7" />
        <p className="mt-4 text-[13px] font-semibold text-charcoal/60">{label}</p>
      </div>
    </div>
  );
}

/** Spinner card over a dimmed page. `label` set → visible (after a short delay, so fast responses don't flash). */
export function BusyOverlay({ label, delay = 200 }) {
  const [shown, setShown] = useState(null);
  useEffect(() => {
    if (!label) { setShown(null); return undefined; }
    if (shown) { setShown(label); return undefined; }
    const t = setTimeout(() => setShown(label), delay);
    return () => clearTimeout(t);
  }, [label]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!shown) return null;
  return (
    <div role="alertdialog" aria-busy="true" aria-live="assertive" aria-label={shown} className="fixed inset-0 z-[190] grid place-items-center bg-ivory/70 backdrop-blur-[3px] cursor-wait animate-[fadein_.2s_ease]">
      <div className="flex items-center gap-4 rounded-2xl bg-white shadow-[0_24px_60px_-24px_rgba(6,20,43,.45)] border border-navy/5 px-6 py-5 max-w-[90vw]">
        <Spinner className="w-8 h-8 shrink-0" />
        <div>
          <p className="text-[15px] font-extrabold text-navy">{shown}</p>
          <p className="text-[12px] text-charcoal/55 mt-0.5">Please wait — don&apos;t close or refresh this page.</p>
        </div>
      </div>
    </div>
  );
}

/** Thin indeterminate bar at the very top of the window. */
export function TopProgress({ active }) {
  return (
    <div aria-hidden="true" className={`fixed top-0 inset-x-0 z-[200] h-[3px] overflow-hidden pointer-events-none transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-0'}`}>
      <div className="h-full w-1/3 bg-gradient-to-r from-gold via-gold-soft to-gold rounded-full animate-[topbar_1.1s_ease-in-out_infinite]" />
    </div>
  );
}

/** Inside a dashboard (sidebar stays) while a page's code is loading. */
export function SectionLoader({ label = 'Loading…' }) {
  return (
    <div role="status" className="min-h-[50vh] grid place-items-center">
      <div className="flex flex-col items-center">
        <Spinner className="w-9 h-9" />
        <p className="mt-4 text-[13px] font-semibold text-charcoal/60">{label}</p>
      </div>
    </div>
  );
}

/** Mounted once (Providers): global busy overlay + top progress bar from the store's request tracking. */
export function GlobalLoading() {
  const busy = useStore((s) => s.busy);
  const net = useStore((s) => s.net);
  const loaded = useStore((s) => s.loaded);
  return (
    <>
      <TopProgress active={net > 0 || !loaded} />
      <BusyOverlay label={busy} />
    </>
  );
}
