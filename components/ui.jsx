'use client';
// Shared building blocks for the admin and customer dashboards.
import { useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

export function Logo({ className = 'h-12', href = '/' }) {
  return (
    <Link href={href} className={`logo block shrink-0 ${className}`} aria-label="JOLOF TRADING home">
      {/* Client-supplied logo, used unaltered */}
      <img src="/brand/logo.webp" alt="JOLOF TRADE CENTER logo" className="h-full w-auto" />
    </Link>
  );
}

export function Pill({ meta, children, className = '' }) {
  return <span className={`pill ${meta?.cls || 'bg-sand text-charcoal/70'} ${className}`}>{children || meta?.label}</span>;
}

export function PageHeader({ kicker, title, sub, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div>
        {kicker && <p className="kicker">{kicker}</p>}
        <h1 className="h-display text-navy text-[1.8rem] sm:text-[2.2rem] mt-2">{title}</h1>
        {sub && <p className="text-[14px] text-charcoal/60 mt-1.5 max-w-2xl">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, hint, tone = 'navy', href }) {
  const tones = { navy: 'bg-navy text-white', emerald: 'bg-emerald text-white', gold: 'bg-gold-soft text-navy', ivory: 'bg-ivory text-navy' };
  const body = (
    <div className="dash-card p-5 h-full flex items-start gap-4 hover:shadow-[0_18px_40px_-28px_rgba(11,35,71,.5)] transition">
      {Icon && <span className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${tones[tone]}`}><Icon className="w-5 h-5" strokeWidth={1.8} /></span>}
      <div className="min-w-0">
        <p className="text-[11px] font-extrabold tracking-[.14em] uppercase text-charcoal/50">{label}</p>
        <p className="text-[1.6rem] font-extrabold text-navy leading-tight mt-1">{value}</p>
        {hint && <p className="text-[12.5px] text-charcoal/55 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="text-center py-14 px-6">
      {Icon && <span className="mx-auto w-14 h-14 rounded-full bg-ivory grid place-items-center text-gold"><Icon className="w-6 h-6" strokeWidth={1.6} /></span>}
      <p className="font-display text-xl text-navy mt-4">{title}</p>
      {body && <p className="text-[13.5px] text-charcoal/60 mt-1.5 max-w-sm mx-auto">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Field({ label, children, hint, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="dash-label">{label}</span>
      {children}
      {hint && <span className="block text-[11.5px] text-charcoal/50 mt-1">{hint}</span>}
    </label>
  );
}

function useLockAndEsc(open, onClose) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
}

export function Modal({ open, onClose, title, kicker, children, footer, size = 'max-w-xl' }) {
  useLockAndEsc(open, onClose);
  return (
    <div className={`modal fixed inset-0 z-[110] grid place-items-center p-4 ${open ? 'open' : ''}`} aria-hidden={!open}>
      <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-[2px]" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className={`panel relative w-full ${size} max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden`}>
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-navy/5">
          <div>
            {kicker && <p className="kicker">{kicker}</p>}
            <h2 className="font-display text-2xl text-navy mt-1">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="icon-btn -mr-2 -mt-1" aria-label="Close"><X /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{open && children}</div>
        {footer && <div className="px-6 py-4 border-t border-navy/5 bg-ivory/60 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, kicker, children, footer, width = 'max-w-[560px]' }) {
  useLockAndEsc(open, onClose);
  return (
    <>
      <div className={`scrim fixed inset-0 z-[100] bg-navy-950/55 ${open ? 'open' : ''}`} onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-label={title} aria-hidden={!open}
        className={`drawer right fixed top-0 right-0 bottom-0 z-[101] w-full ${width} bg-white shadow-2xl flex flex-col ${open ? 'open' : ''}`}>
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-navy/5">
          <div>
            {kicker && <p className="kicker">{kicker}</p>}
            <h2 className="font-display text-2xl text-navy mt-1">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="icon-btn -mr-2 -mt-1" aria-label="Close"><X /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{open && children}</div>
        {footer && <div className="px-6 py-4 border-t border-navy/5 bg-ivory/60 flex flex-wrap justify-end gap-2">{footer}</div>}
      </aside>
    </>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar">
      {tabs.map((t) => (
        <button key={t.value} type="button" className="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}>
          {t.label}{typeof t.count === 'number' && <span className="ml-1.5 opacity-60">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Horizontal order progress used in both dashboards */
export function OrderProgress({ status, flow }) {
  if (status === 'cancelled') return <p className="text-[13px] font-bold text-[#B4432F]">This order was cancelled.</p>;
  const idx = flow.indexOf(status);
  return (
    <ol className="flex items-center gap-1.5">
      {flow.map((s, i) => (
        <li key={s} className="flex-1 min-w-0">
          <div className={`h-1.5 rounded-full ${i <= idx ? 'bg-emerald' : 'bg-navy/10'}`} />
          <p className={`mt-2 text-[10.5px] font-extrabold uppercase tracking-[.1em] truncate ${i <= idx ? 'text-emerald' : 'text-charcoal/40'}`}>{s}</p>
        </li>
      ))}
    </ol>
  );
}
