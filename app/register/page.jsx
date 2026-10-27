'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Check, Clock3, Store, UserRound, Warehouse } from 'lucide-react';
import { useStore } from '@/lib/store';
import { LOCATIONS, STATES } from '@/lib/locations';
import { MinimalHeader } from '@/components/account/shared';

const BUSINESS_TYPES = ['Grocery store', 'Supermarket', 'Beauty salon & retail', 'Restaurant / catering', 'Distributor / wholesaler', 'Online store', 'Other'];
const SUPPLIER_TYPES = ['Food wholesaler', 'Cosmetics distributor', 'Importer', 'Manufacturer', 'Mixed wholesaler', 'Other'];

function Input({ id, label, error, className = '', ...rest }) {
  return (
    <div className={`field ${error ? 'invalid' : ''} ${className}`}>
      <label htmlFor={id}>{label}</label>
      <input id={id} {...rest} />
      <p className="err">{error}</p>
    </div>
  );
}

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next');
  const register = useStore((s) => s.register);
  const [type, setType] = useState(params.get('type') === 'supplier' ? 'supplier' : 'individual');
  const [f, setF] = useState({ name: params.get('name') || '', email: params.get('email') || '', phone: '', password: '', confirm: '', company: '', abn: '', businessType: '', line1: '', city: '', state: '', postcode: '', locationId: '', country: 'United States', agree: false });
  const business = type !== 'individual';
  const [err, setErr] = useState({});
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState(null);
  const up = (k) => (e) => { const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value; setF((x) => ({ ...x, [k]: v })); if (err[k]) setErr((x) => ({ ...x, [k]: '' })); };

  const validate = () => {
    const e = {};
    if (!f.name.trim()) e.name = 'Please enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Please enter a valid email address.';
    if (f.password.length < 6) e.password = 'Use at least 6 characters.';
    if (f.confirm !== f.password) e.confirm = 'Passwords do not match.';
    if (business) {
      if (!f.company.trim()) e.company = 'Business name is required.';
      if (!f.abn.trim()) e.abn = 'EIN / Tax ID is required.';
      if (!f.businessType) e.businessType = 'Choose a business type.';
      if (!f.phone.trim()) e.phone = 'A contact phone is required for trade accounts.';
      ['line1', 'city', 'state', 'postcode'].forEach((k) => { if (!f[k].trim()) e[k] = 'Required'; });
      if (type === 'supplier' && !f.locationId) e.locationId = 'Choose the nearest delivery city to this warehouse.';
    }
    if (!f.agree) e.agree = 'Please accept the terms to continue.';
    return e;
  };

  const submit = (ev) => {
    ev.preventDefault();
    const e = validate();
    setErr(e);
    if (Object.keys(e).length) { document.getElementById(Object.keys(e)[0])?.focus(); return; }
    const data = business ? { ...f, type } : { name: f.name, email: f.email, phone: f.phone, password: f.password, type };
    const r = register(data);
    if (!r.ok) { setFormError(r.error); setErr({ email: r.error }); return; }
    if (business) setDone(r.user);
    else router.push(next && next.startsWith('/') ? next : '/account');
  };

  if (done) {
    return (
      <div className="text-center py-4">
        <span className="mx-auto w-16 h-16 rounded-full bg-gold-pale text-gold grid place-items-center"><Clock3 className="w-7 h-7" strokeWidth={1.7} /></span>
        <h2 className="h-display text-navy text-[1.9rem] mt-5">Application received</h2>
        <p className="text-[14.5px] text-charcoal/65 mt-3 max-w-md mx-auto">
          Thanks {done.name.split(' ')[0]} — your {done.role === 'vendor' ? 'supplier' : 'trade'} account for <b className="text-navy">{done.company}</b> is now <b className="text-navy">under review</b>. Our team usually approves accounts within one business day.
        </p>
        <div className="mt-6 text-left rounded-2xl bg-ivory border border-navy/5 p-5 space-y-2.5 text-[13.5px] text-charcoal/75">
          {done.role === 'vendor' ? (<>
            <p className="flex gap-2.5"><Check className="w-4 h-4 text-emerald shrink-0 mt-0.5" /> Add your warehouses and the catalogue products you stock</p>
            <p className="flex gap-2.5"><Check className="w-4 h-4 text-emerald shrink-0 mt-0.5" /> Set your supply price and stock per warehouse</p>
            <p className="flex gap-2.5"><Clock3 className="w-4 h-4 text-gold shrink-0 mt-0.5" /> Orders near your warehouses are routed to you once approved</p>
          </>) : (<>
            <p className="flex gap-2.5"><Check className="w-4 h-4 text-emerald shrink-0 mt-0.5" /> You can browse the full catalogue right away</p>
            <p className="flex gap-2.5"><Check className="w-4 h-4 text-emerald shrink-0 mt-0.5" /> Send product, bulk and commodity quote requests</p>
            <p className="flex gap-2.5"><Clock3 className="w-4 h-4 text-gold shrink-0 mt-0.5" /> Placing orders unlocks once your account is approved</p>
          </>)}
        </div>
        <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href={done.role === 'vendor' ? '/vendor' : '/account'} className="btn btn-navy">{done.role === 'vendor' ? 'Set up my supplier account' : 'Go to my account'} <ArrowRight className="mv" /></Link>
          <Link href="/" className="btn btn-line-dark">Browse the store</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <p className="dash-label">Account type</p>
      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { v: 'individual', icon: UserRound, t: 'Individual', d: 'Shop for home — order online and track deliveries.' },
          { v: 'retailer', icon: Store, t: 'Retailer / Business', d: 'Trade account for shops — bulk quotes & wholesale ordering.' },
          { v: 'supplier', icon: Warehouse, t: 'Supplier / Wholesaler', d: 'Stock our catalogue from your warehouses and fulfil nearby orders.' },
        ].map(({ v, icon: Icon, t, d }) => {
          const on = type === v;
          return (
            <button key={v} type="button" onClick={() => setType(v)} aria-pressed={on}
              className={`text-left rounded-2xl border-[1.5px] p-4 transition ${on ? 'border-emerald bg-[#F2F8F5] shadow-[0_0_0_3px_rgba(7,86,60,.12)]' : 'border-[#E2DED2] hover:border-navy/40'}`}>
              <div className="flex items-center justify-between">
                <span className={`w-10 h-10 rounded-xl grid place-items-center ${on ? 'bg-emerald text-white' : 'bg-ivory text-navy'}`}><Icon className="w-5 h-5" strokeWidth={1.8} /></span>
                <span className={`w-5 h-5 rounded-full border-2 grid place-items-center ${on ? 'border-emerald' : 'border-navy/20'}`}>{on && <span className="w-2.5 h-2.5 rounded-full bg-emerald" />}</span>
              </div>
              <p className="font-extrabold text-navy mt-3">{t}</p>
              <p className="text-[12.5px] text-charcoal/60 mt-0.5">{d}</p>
            </button>
          );
        })}
      </div>

      <div className="grid sm:grid-cols-2 gap-x-4 gap-y-4 mt-7">
        <Input id="name" label="Full name *" value={f.name} onChange={up('name')} error={err.name} autoComplete="name" />
        <Input id="email" label="Email *" type="email" value={f.email} onChange={up('email')} error={err.email} autoComplete="email" />
        <Input id="phone" label={business ? 'Phone *' : 'Phone'} type="tel" value={f.phone} onChange={up('phone')} error={err.phone} autoComplete="tel" />
        <div className="hidden sm:block" />
        <Input id="password" label="Password *" type="password" value={f.password} onChange={up('password')} error={err.password} autoComplete="new-password" />
        <Input id="confirm" label="Confirm password *" type="password" value={f.confirm} onChange={up('confirm')} error={err.confirm} autoComplete="new-password" />
      </div>

      {business && (
        <div className="mt-7 rounded-2xl border border-navy/10 bg-ivory/60 p-4 sm:p-5">
          <p className="text-[10.5px] font-extrabold tracking-[.2em] uppercase text-gold">{type === 'supplier' ? 'Business & main warehouse' : 'Business details'}</p>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <Input id="company" label="Business name *" value={f.company} onChange={up('company')} error={err.company} />
            <Input id="abn" label="EIN / Tax ID *" value={f.abn} onChange={up('abn')} error={err.abn} placeholder="e.g. 12-3456789" />
            <div className={`field sm:col-span-2 ${err.businessType ? 'invalid' : ''}`}>
              <label htmlFor="businessType">Business type *</label>
              <select id="businessType" value={f.businessType} onChange={up('businessType')}>
                <option value="">Select…</option>
                {(type === 'supplier' ? SUPPLIER_TYPES : BUSINESS_TYPES).map((b) => <option key={b}>{b}</option>)}
              </select>
              <p className="err">{err.businessType}</p>
            </div>
            <Input id="line1" label={type === 'supplier' ? 'Warehouse address *' : 'Store address *'} className="sm:col-span-2" value={f.line1} onChange={up('line1')} error={err.line1} />
            <Input id="city" label="City *" value={f.city} onChange={up('city')} error={err.city} />
            <div className="grid grid-cols-2 gap-4">
              <div className={`field ${err.state ? 'invalid' : ''}`}>
                <label htmlFor="state">State *</label>
                <select id="state" value={f.state} onChange={up('state')}><option value="">—</option>{STATES.map((st) => <option key={st}>{st}</option>)}</select>
                <p className="err">{err.state}</p>
              </div>
              <Input id="postcode" label="ZIP code *" value={f.postcode} onChange={up('postcode')} error={err.postcode} inputMode="numeric" />
            </div>
          </div>
          {type === 'supplier' && (
            <div className={`field mt-4 ${err.locationId ? 'invalid' : ''}`}>
              <label htmlFor="locationId">Nearest delivery city (used for order routing) *</label>
              <select id="locationId" value={f.locationId} onChange={up('locationId')}>
                <option value="">Select…</option>
                {(LOCATIONS.some((l) => l.state === f.state) ? LOCATIONS.filter((l) => l.state === f.state) : LOCATIONS).map((l) => <option key={l.id} value={l.id}>{l.city}, {l.state}</option>)}
              </select>
              <p className="err">{err.locationId}</p>
            </div>
          )}
          <p className="text-[12px] text-charcoal/55 mt-4 flex gap-2"><Clock3 className="w-4 h-4 shrink-0 text-gold" /> {type === 'supplier' ? 'Supplier accounts are reviewed by our team before orders are routed to you. You can add more warehouses later.' : 'Trade accounts are reviewed by our team before ordering is enabled.'}</p>
        </div>
      )}

      <div className={`mt-6 ${err.agree ? 'text-[#B4432F]' : ''}`}>
        <label className="inline-flex items-start gap-2.5 text-[13px] cursor-pointer">
          <input id="agree" type="checkbox" checked={f.agree} onChange={up('agree')} className="w-4 h-4 mt-0.5 accent-[#07563C]" />
          <span>I agree to the JOLOF TRADING Terms &amp; Conditions and Privacy Policy.</span>
        </label>
        {err.agree && <p className="text-[12px] mt-1">{err.agree}</p>}
      </div>
      {formError && <p role="alert" className="mt-4 text-[13px] font-semibold text-[#B4432F] bg-[#F8E7E3] rounded-xl px-4 py-3">{formError}</p>}

      <button type="submit" className="btn btn-navy w-full mt-6">{type === 'retailer' ? 'Apply for trade account' : type === 'supplier' ? 'Apply as a supplier' : 'Create account'} <ArrowRight className="mv" /></button>
      <p className="text-center text-[13.5px] text-charcoal/60 mt-5">
        Already have an account? <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-bold text-emerald hover:text-navy">Sign in</Link>
      </p>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-ivory flex flex-col">
      <MinimalHeader />
      <main className="flex-1 px-4 py-10 sm:py-14">
        <div className="w-full max-w-[760px] mx-auto bg-white rounded-3xl border border-navy/5 shadow-[0_30px_70px_-40px_rgba(11,35,71,.45)] p-6 sm:p-10">
          <p className="kicker">Join JOLOF TRADING</p>
          <h1 className="h-display text-navy text-[2.1rem] mt-3">Create your account</h1>
          <p className="text-[14px] text-charcoal/60 mt-2 mb-7">Individuals can order straight away. Retailers get a trade account with bulk quotes. Suppliers fulfil orders from their own warehouses.</p>
          <Suspense fallback={<div className="h-96" />}><RegisterForm /></Suspense>
        </div>
      </main>
    </div>
  );
}
