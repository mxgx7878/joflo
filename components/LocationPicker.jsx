'use client';
// Delivery location: asked on the first visit, shown in the header, required at checkout.
// Orders are routed to the nearest supplier warehouse that holds the stock for this location.
import { useEffect, useMemo, useState } from 'react';
import { MapPin, Search, Navigation, Check } from 'lucide-react';
import { useStore, useStoreReady } from '@/lib/store';
import { LOCATIONS, REGIONS, getLocation, locationLabel } from '@/lib/locations';
import { Modal } from '@/components/ui';

export function useDeliveryLocation() {
  const ready = useStoreReady();
  const dl = useStore((s) => s.deliveryLocation);
  const loc = ready && dl ? getLocation(dl.locationId) : null;
  return { ready, saved: ready ? dl : null, location: loc, label: loc ? [dl.suburb, locationLabel(loc)].filter(Boolean).join(', ') : '' };
}

export function LocationModal({ open, onClose, required = false, onSaved }) {
  const dl = useStore((s) => s.deliveryLocation);
  const setDeliveryLocation = useStore((s) => s.setDeliveryLocation);
  const [q, setQ] = useState('');
  const [pick, setPick] = useState(null);
  const [suburb, setSuburb] = useState('');
  const [postcode, setPostcode] = useState('');

  useEffect(() => {
    if (!open) return;
    setQ('');
    setPick(dl?.locationId || null);
    setSuburb(dl?.suburb || '');
    setPostcode(dl?.postcode || '');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return LOCATIONS.filter((l) => !t || `${l.city} ${l.state}`.toLowerCase().includes(t));
  }, [q]);

  const save = () => {
    if (!pick) return;
    setDeliveryLocation({ locationId: pick, suburb: suburb.trim(), postcode: postcode.trim() });
    onSaved?.(pick);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} kicker="Delivery location" title="Where should we deliver?" size="max-w-2xl"
      footer={<>
        {!required && <button type="button" className="dash-btn dash-btn-ghost" onClick={onClose}>Not now</button>}
        <button type="button" className="dash-btn dash-btn-navy" disabled={!pick} onClick={save}><Check /> Save location</button>
      </>}>
      <p className="text-[13.5px] text-charcoal/65 -mt-1 mb-4 flex gap-2">
        <Navigation className="w-4 h-4 text-emerald shrink-0 mt-0.5" />
        We ship from the supplier warehouse closest to you, so choosing your city first gives you the fastest delivery.
      </p>
      <label className="flex items-center gap-2 h-11 rounded-full bg-ivory border-[1.5px] border-[#E2DED2] px-4 focus-within:border-gold transition">
        <Search className="w-4 h-4 text-navy/50" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search city or state…" className="flex-1 bg-transparent text-[14px] focus:outline-none" />
      </label>
      <div className="mt-4 max-h-[300px] overflow-y-auto pr-1 space-y-4">
        {REGIONS.map((rg) => {
          const rows = list.filter((l) => l.region === rg);
          if (!rows.length) return null;
          return (
            <div key={rg}>
              <p className="text-[10.5px] font-extrabold tracking-[.2em] uppercase text-charcoal/45 mb-2">{rg}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {rows.map((l) => {
                  const on = pick === l.id;
                  return (
                    <button key={l.id} type="button" onClick={() => setPick(l.id)} aria-pressed={on}
                      className={`flex items-center gap-2 rounded-xl border-[1.5px] px-3 py-2.5 text-left text-[13.5px] font-bold transition ${on ? 'border-emerald bg-[#F2F8F5] text-emerald' : 'border-[#E2DED2] text-navy hover:border-navy/40'}`}>
                      <MapPin className="w-4 h-4 shrink-0" strokeWidth={1.8} /><span className="truncate">{l.city}<span className="font-semibold opacity-50"> {l.state}</span></span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {!list.length && <p className="text-[13px] text-charcoal/55 py-6 text-center">No delivery city matches “{q}”. Pick the nearest metro to you.</p>}
      </div>
      <div className="grid grid-cols-[1fr_120px] gap-3 mt-5">
        <label className="block"><span className="dash-label">Neighborhood / town (optional)</span><input className="dash-input" value={suburb} onChange={(e) => setSuburb(e.target.value)} placeholder="e.g. Harlem" /></label>
        <label className="block"><span className="dash-label">ZIP code</span><input className="dash-input" value={postcode} onChange={(e) => setPostcode(e.target.value)} inputMode="numeric" placeholder="10027" /></label>
      </div>
    </Modal>
  );
}

/** Asks for the location once per visit when none is saved yet. */
export function LocationGate() {
  const { ready, saved } = useDeliveryLocation();
  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!ready || saved || dismissed) return;
    const t = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(t);
  }, [ready, saved, dismissed]);
  return <LocationModal open={open} onClose={() => { setOpen(false); setDismissed(true); }} />;
}

/** "Deliver to New York, NY" button — opens the picker. */
export function LocationButton({ className = '', dark = false }) {
  const { label } = useDeliveryLocation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`inline-flex items-center gap-1.5 min-w-0 ${className}`} title="Change delivery location">
        <MapPin className={`w-3.5 h-3.5 shrink-0 ${dark ? 'text-gold-soft' : 'text-emerald'}`} />
        <span className="truncate">{label ? <>Deliver to <b className="font-extrabold">{label}</b></> : 'Set delivery location'}</span>
      </button>
      {open && <LocationModal open onClose={() => setOpen(false)} />}
    </>
  );
}
