'use client';
import { useState } from 'react';
import { LOCATIONS, REGIONS } from '@/lib/locations';
import { Field } from '@/components/ui';
import { Toggle } from '@/components/admin/common';

const BLANK = { name: '', line1: '', suburb: '', postcode: '', locationId: '', active: true };

/** Shared by the supplier portal and the admin supplier page */
export default function WarehouseForm({ initial, onSave, onCancel }) {
  const [w, setW] = useState({ ...BLANK, ...initial });
  const [err, setErr] = useState({});
  const up = (k) => (e) => setW({ ...w, [k]: e.target.value });
  const submit = () => {
    const e = {};
    if (!w.name.trim()) e.name = true;
    if (!w.line1.trim()) e.line1 = true;
    if (!w.locationId) e.locationId = true;
    setErr(e);
    if (!Object.keys(e).length) onSave({ ...w, name: w.name.trim() });
  };
  const cls = (k) => `dash-input ${err[k] ? '!border-[#B4432F]' : ''}`;
  return (
    <div className="space-y-4">
      <Field label="Warehouse name *"><input className={cls('name')} value={w.name} onChange={up('name')} placeholder="e.g. Houston East DC" /></Field>
      <Field label="Street address *"><input className={cls('line1')} value={w.line1} onChange={up('line1')} /></Field>
      <div className="grid grid-cols-[1fr_120px] gap-3">
        <Field label="City, State"><input className="dash-input" value={w.suburb} onChange={up('suburb')} placeholder="Houston, TX" /></Field>
        <Field label="ZIP code"><input className="dash-input" value={w.postcode} onChange={up('postcode')} inputMode="numeric" /></Field>
      </div>
      <Field label="Delivery area (nearest city) *" hint="Orders are routed by distance from this city to the customer's location.">
        <select className={cls('locationId')} value={w.locationId} onChange={up('locationId')}>
          <option value="">Select…</option>
          {REGIONS.map((r) => <optgroup key={r} label={r}>{LOCATIONS.filter((l) => l.region === r).map((l) => <option key={l.id} value={l.id}>{l.city}, {l.state}</option>)}</optgroup>)}
        </select>
      </Field>
      <Toggle checked={w.active !== false} onChange={(v) => setW({ ...w, active: v })} label="Receiving orders" />
      <div className="flex justify-end gap-2 pt-2 border-t border-navy/5">
        {onCancel && <button className="dash-btn dash-btn-ghost" onClick={onCancel}>Cancel</button>}
        <button className="dash-btn dash-btn-navy" onClick={submit}>Save warehouse</button>
      </div>
    </div>
  );
}

