'use client';
// Shared building blocks for the admin and customer dashboards.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export function Logo({ className = 'h-12', href = '/' }) {
  return (
    <Link href={href} className={`logo block shrink-0 ${className}`} aria-label="JOLOF TRADE CENTER home">
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

export const PAGE_SIZES = [10, 25, 50, 100];

/**
 * Client-side paging for a filtered list.
 *   const pg = usePaged(list, [tab, q]);  → pg.items (this page), and <Pagination {...pg} />
 * Goes back to page 1 when any value in `reset` changes (new filter / search), and never
 * points past the last page (e.g. after an item is deleted).
 */
export function usePaged(list, reset = [], initialSize = 25) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(initialSize);
  useEffect(() => { setPage(1); }, reset); // eslint-disable-line react-hooks/exhaustive-deps
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(page, pages);
  const items = useMemo(() => list.slice((current - 1) * size, current * size), [list, current, size]);
  return { items, page: current, pages, size, total, onPage: setPage, onSize: (n) => { setSize(n); setPage(1); } };
}

/** "1 … 4 5 6 … 20" around the current page */
function pageWindow(page, pages) {
  const set = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const nums = [...set].sort((a, b) => a - b);
  const out = [];
  nums.forEach((n, i) => { if (i && n - nums[i - 1] > 1) out.push(`gap${n}`); out.push(n); });
  return out;
}

/** Page controls under a table / list: "Showing 26–50 of 312 orders", page numbers, rows per page. */
export function Pagination({ page, pages, size, total, onPage, onSize, noun = 'orders', className = '' }) {
  if (!total) return null;
  const from = (page - 1) * size + 1;
  const to = Math.min(total, page * size);
  const btn = 'min-w-[34px] h-[34px] px-2 rounded-full text-[13px] font-bold transition disabled:opacity-35 disabled:cursor-not-allowed';
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-navy/5 print:hidden ${className}`}>
      <p className="text-[12.5px] text-charcoal/60">Showing <b className="text-navy">{from}–{to}</b> of <b className="text-navy">{total}</b> {noun}</p>
      <div className="flex flex-wrap items-center gap-3">
        {pages > 1 && (
          <nav className="flex items-center gap-1" aria-label="Pages">
            <button type="button" className={`${btn} text-navy hover:bg-ivory`} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft className="w-4 h-4 mx-auto" /></button>
            {pageWindow(page, pages).map((n) => (typeof n === 'string'
              ? <span key={n} className="px-1 text-charcoal/40">…</span>
              : <button key={n} type="button" className={`${btn} ${n === page ? 'bg-navy text-white' : 'text-navy hover:bg-ivory'}`} aria-current={n === page ? 'page' : undefined} onClick={() => onPage(n)}>{n}</button>))}
            <button type="button" className={`${btn} text-navy hover:bg-ivory`} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight className="w-4 h-4 mx-auto" /></button>
          </nav>
        )}
        <label className="flex items-center gap-2 text-[12.5px] text-charcoal/60">
          Per page
          <select value={size} onChange={(e) => onSize(Number(e.target.value))} className="h-[34px] rounded-full border-[1.5px] border-[#E2DED2] bg-white px-3 text-[13px] font-bold text-navy focus:outline-none focus:border-gold">
            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
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
