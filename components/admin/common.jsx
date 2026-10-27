'use client';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { productImg } from '@/lib/catalogue';
import { Modal } from '@/components/ui';

export function Card({ title, action, children, className = '', pad = true }) {
  return (
    <section className={`dash-card ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
          {title && <h2 className="text-[15px] font-extrabold text-navy">{title}</h2>}
          {action}
        </div>
      )}
      <div className={pad ? 'px-5 pb-5' : ''}>{children}</div>
    </section>
  );
}

export function TableWrap({ children }) {
  return <div className="overflow-x-auto">{children}</div>;
}

export function SearchBox({ value, onChange, placeholder = 'Search…', className = '' }) {
  return (
    <label className={`min-w-0 flex items-center gap-2 h-10 rounded-full bg-white border-[1.5px] border-[#E2DED2] px-4 focus-within:border-gold transition ${className}`}>
      <Search className="w-4 h-4 text-navy/50 shrink-0" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="flex-1 min-w-0 bg-transparent text-[13.5px] focus:outline-none" />
    </label>
  );
}

export function Select({ value, onChange, options, className = '' }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className={`h-10 rounded-full bg-white border-[1.5px] border-[#E2DED2] px-4 pr-8 text-[13px] font-semibold text-navy focus:outline-none focus:border-gold ${className}`}>
      {options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
    </select>
  );
}

export function Thumb({ p, size = 'w-11 h-11' }) {
  return <img src={productImg(p)} alt="" className={`${size} rounded-xl object-contain bg-ivory border border-navy/5 p-1 shrink-0`} loading="lazy" />;
}

export function Initials({ name, className = 'w-9 h-9 text-[12px]' }) {
  return <span className={`rounded-full bg-navy text-white grid place-items-center font-extrabold shrink-0 ${className}`}>{(name || '?').split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase()}</span>;
}

/** confirm dialog hook: const [ask, dialog] = useConfirm(); ask({title, body, confirm, danger}, onYes) */
export function useConfirm() {
  const [state, setState] = useState(null);
  const ask = (opts, onYes) => setState({ ...opts, onYes });
  const close = () => setState(null);
  const dialog = (
    <Modal open={!!state} onClose={close} title={state?.title || ''} kicker="Please confirm" size="max-w-md"
      footer={<>
        <button className="dash-btn dash-btn-ghost" onClick={close}>Cancel</button>
        <button className={`dash-btn ${state?.danger ? 'bg-[#B4432F] text-white hover:bg-[#93351f]' : 'dash-btn-navy'}`} onClick={() => { state.onYes(); close(); }}>{state?.confirm || 'Confirm'}</button>
      </>}>
      <p className="text-[14px] text-charcoal/70">{state?.body}</p>
    </Modal>
  );
  return [ask, dialog];
}

export function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-9 w-64 bg-navy/5 rounded-xl" />
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-28 bg-white rounded-2xl" />)}</div>
      <div className="h-80 bg-white rounded-2xl" />
    </div>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center justify-between gap-3 py-2 cursor-pointer select-none">
      <span className="text-[13.5px] font-semibold text-navy">{label}</span>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition ${checked ? 'bg-emerald' : 'bg-navy/15'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </label>
  );
}

export function KV({ k, v }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-[13.5px]">
      <span className="text-charcoal/55">{k}</span>
      <span className="font-semibold text-navy text-right">{v || '—'}</span>
    </div>
  );
}
