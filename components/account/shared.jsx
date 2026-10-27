'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useStore, useCurrentUser } from '@/lib/store';
import { Logo, Field } from '@/components/ui';

/** Minimal header used on login / register / checkout */
export function MinimalHeader({ secure = false }) {
  return (
    <header className="bg-white border-b border-navy/5">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 h-[72px] lg:h-[84px] flex items-center justify-between gap-4">
        <Logo className="h-[50px] lg:h-[60px]" />
        <div className="flex items-center gap-5">
          {secure && (
            <span className="hidden sm:inline-flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[.14em] text-emerald">
              <ShieldCheck className="w-4 h-4" /> Secure checkout
            </span>
          )}
          <Link href="/" className="inline-flex items-center gap-2 text-[13px] font-bold text-navy hover:text-emerald">
            <ArrowLeft className="w-4 h-4" /> Back to store
          </Link>
        </div>
      </div>
    </header>
  );
}

export function PageLoader() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-56 rounded-full bg-sand" />
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-[20px] bg-ivory border border-navy/5" />)}
      </div>
      <div className="h-64 rounded-[20px] bg-ivory border border-navy/5" />
    </div>
  );
}

/** Orders that belong to the logged in user (stable, memoised) */
export function useMyOrders() {
  const user = useCurrentUser();
  const orders = useStore((s) => s.orders);
  return useMemo(() => (user ? orders.filter((o) => o.userId === user.id) : []), [orders, user]);
}

/** Inquiries for the user — by account id or matching email (guest enquiries made before sign-up) */
export function useMyInquiries() {
  const user = useCurrentUser();
  const inquiries = useStore((s) => s.inquiries);
  return useMemo(() => {
    if (!user) return [];
    const em = user.email.toLowerCase();
    return inquiries.filter((i) => i.userId === user.id || (i.email || '').toLowerCase() === em);
  }, [inquiries, user]);
}

export const addressLines = (a) => (a ? [a.line1, [a.city, a.state, a.postcode].filter(Boolean).join(' '), a.country].filter(Boolean) : []);

export function AddressBlock({ address, className = '' }) {
  if (!address) return <p className={`text-[13.5px] text-charcoal/50 ${className}`}>No address on file</p>;
  return (
    <div className={`text-[13.5px] leading-relaxed text-charcoal/80 ${className}`}>
      {address.label && <p className="font-bold text-navy">{address.label}</p>}
      {addressLines(address).map((l) => <p key={l}>{l}</p>)}
    </div>
  );
}

const EMPTY_ADDR = { label: '', line1: '', city: '', state: '', postcode: '', country: 'Australia', isDefault: false };

/** Address form — calls onSubmit(address) with a validated object */
export function AddressForm({ initial, onSubmit, onCancel, submitLabel = 'Save address', showDefault = true }) {
  const [a, setA] = useState({ ...EMPTY_ADDR, ...initial });
  const [err, setErr] = useState({});
  const up = (k) => (e) => setA((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const submit = (e) => {
    e.preventDefault();
    const er = {};
    ['line1', 'city', 'state', 'postcode'].forEach((k) => { if (!String(a[k] || '').trim()) er[k] = true; });
    setErr(er);
    if (Object.keys(er).length) return;
    onSubmit({ ...a, label: a.label.trim() || 'Address' });
  };
  const cls = (k) => `dash-input ${err[k] ? '!border-[#B4432F]' : ''}`;
  return (
    <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4" noValidate>
      <Field label="Label"><input className="dash-input" value={a.label} onChange={up('label')} placeholder="Store, Home, Warehouse…" /></Field>
      <Field label="Country"><input className="dash-input" value={a.country} onChange={up('country')} /></Field>
      <Field label="Street address *" className="sm:col-span-2"><input className={cls('line1')} value={a.line1} onChange={up('line1')} placeholder="Unit / street" /></Field>
      <Field label="Suburb / City *"><input className={cls('city')} value={a.city} onChange={up('city')} /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="State *"><input className={cls('state')} value={a.state} onChange={up('state')} placeholder="VIC" /></Field>
        <Field label="Postcode *"><input className={cls('postcode')} value={a.postcode} onChange={up('postcode')} inputMode="numeric" /></Field>
      </div>
      {Object.keys(err).length > 0 && <p className="sm:col-span-2 text-[12.5px] text-[#B4432F]">Please complete the highlighted fields.</p>}
      <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-1">
        {showDefault ? (
          <label className="inline-flex items-center gap-2 text-[13px] font-semibold text-navy cursor-pointer">
            <input type="checkbox" checked={!!a.isDefault} onChange={up('isDefault')} className="w-4 h-4 accent-[#07563C]" /> Set as default address
          </label>
        ) : <span />}
        <div className="flex gap-2">
          {onCancel && <button type="button" onClick={onCancel} className="dash-btn dash-btn-ghost">Cancel</button>}
          <button type="submit" className="dash-btn dash-btn-navy">{submitLabel}</button>
        </div>
      </div>
    </form>
  );
}

/** Selectable list of saved addresses + "add new" */
export function AddressPicker({ value, onChange }) {
  const user = useCurrentUser();
  const saveAddress = useStore((s) => s.saveAddress);
  const [adding, setAdding] = useState(false);
  const list = user?.addresses || [];
  return (
    <div className="space-y-3">
      {list.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {list.map((a) => {
            const on = value === a.id;
            return (
              <button type="button" key={a.id} onClick={() => onChange(a.id)} aria-pressed={on}
                className={`text-left rounded-2xl border-[1.5px] p-4 transition ${on ? 'border-emerald bg-[#F2F8F5] shadow-[0_0_0_3px_rgba(7,86,60,.12)]' : 'border-[#E2DED2] hover:border-navy/40 bg-white'}`}>
                <div className="flex items-start justify-between gap-3">
                  <AddressBlock address={a} />
                  <span className={`w-5 h-5 rounded-full border-2 grid place-items-center shrink-0 mt-0.5 ${on ? 'border-emerald' : 'border-navy/20'}`}>
                    {on && <span className="w-2.5 h-2.5 rounded-full bg-emerald" />}
                  </span>
                </div>
                {a.isDefault && <span className="pill bg-ivory text-navy mt-2">Default</span>}
              </button>
            );
          })}
        </div>
      )}
      {adding || !list.length ? (
        <div className="rounded-2xl border border-dashed border-navy/20 p-4 sm:p-5 bg-ivory/50">
          <p className="text-[13px] font-extrabold text-navy mb-3">New delivery address</p>
          <AddressForm
            submitLabel="Use this address"
            onCancel={list.length ? () => setAdding(false) : undefined}
            onSubmit={(addr) => {
              saveAddress({ ...addr, isDefault: addr.isDefault || !list.length });
              setAdding(false);
              // newly added address is last in the list
              setTimeout(() => { const u = useStore.getState().currentUser(); const last = u?.addresses[u.addresses.length - 1]; if (last) onChange(last.id); }, 0);
            }}
          />
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="text-[13px] font-bold text-emerald hover:text-navy">+ Add a new address</button>
      )}
    </div>
  );
}

export function SectionCard({ title, kicker, action, children, className = '', bodyClass = 'p-5 sm:p-6' }) {
  return (
    <section className={`dash-card overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-5">
          <div>
            {kicker && <p className="text-[10.5px] font-extrabold tracking-[.2em] uppercase text-gold">{kicker}</p>}
            {title && <h2 className="font-display text-[1.3rem] text-navy leading-tight">{title}</h2>}
          </div>
          {action}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}
