'use client';
import { useState } from 'react';
import { KeyRound, MapPin, Pencil, Plus, Star, Trash2, UserRound } from 'lucide-react';
import { useStore, useCurrentUser } from '@/lib/store';
import { fmtDate, USER_STATUS } from '@/lib/format';
import { Field, Modal, PageHeader, Pill } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { AddressBlock, AddressForm, SectionCard } from '@/components/account/shared';
import { TypeBadge } from '@/components/account/AccountShell';

const BUSINESS_TYPES = ['Grocery store', 'Supermarket', 'Beauty salon & retail', 'Restaurant / catering', 'Distributor / wholesaler', 'Online store', 'Other'];

function ProfileForm({ user }) {
  const toast = useToast();
  const updateProfile = useStore((s) => s.updateProfile);
  const retailer = user.type === 'retailer';
  const [f, setF] = useState({ name: user.name, phone: user.phone || '', company: user.company || '', abn: user.abn || '', businessType: user.businessType || '' });
  const [err, setErr] = useState('');
  const up = (k) => (e) => { setF((x) => ({ ...x, [k]: e.target.value })); setErr(''); };
  const dirty = Object.keys(f).some((k) => (f[k] || '') !== (user[k] || ''));
  const save = (e) => {
    e.preventDefault();
    if (!f.name.trim()) { setErr('Name is required.'); return; }
    if (retailer && !f.company.trim()) { setErr('Business name is required for trade accounts.'); return; }
    updateProfile({ name: f.name.trim(), phone: f.phone.trim(), company: f.company.trim(), ...(retailer ? { abn: f.abn.trim(), businessType: f.businessType } : {}) });
    toast({ text: 'Profile updated' });
  };
  return (
    <form onSubmit={save} className="grid sm:grid-cols-2 gap-4" noValidate>
      <Field label="Full name *"><input className="dash-input" value={f.name} onChange={up('name')} /></Field>
      <Field label="Email" hint="Contact us to change your login email"><input className="dash-input opacity-70" value={user.email} readOnly /></Field>
      <Field label="Phone"><input className="dash-input" value={f.phone} onChange={up('phone')} type="tel" /></Field>
      <Field label={retailer ? 'Business name *' : 'Company (optional)'}><input className="dash-input" value={f.company} onChange={up('company')} /></Field>
      {retailer && (
        <>
          <Field label="EIN / Tax ID"><input className="dash-input" value={f.abn} onChange={up('abn')} /></Field>
          <Field label="Business type">
            <select className="dash-input" value={f.businessType} onChange={up('businessType')}>
              <option value="">Select…</option>{BUSINESS_TYPES.map((b) => <option key={b}>{b}</option>)}
            </select>
          </Field>
        </>
      )}
      {err && <p className="sm:col-span-2 text-[12.5px] font-semibold text-[#B4432F]">{err}</p>}
      <div className="sm:col-span-2 flex justify-end"><button type="submit" disabled={!dirty} className="dash-btn dash-btn-navy">Save changes</button></div>
    </form>
  );
}

function PasswordForm({ user }) {
  const toast = useToast();
  const [f, setF] = useState({ current: '', next: '', confirm: '' });
  const [err, setErr] = useState('');
  const up = (k) => (e) => { setF((x) => ({ ...x, [k]: e.target.value })); setErr(''); };
  const save = async (e) => {
    e.preventDefault();
    if (!f.current) { setErr('Enter your current password.'); return; }
    if (f.next.length < 6) { setErr('New password must be at least 6 characters.'); return; }
    if (f.next !== f.confirm) { setErr('New passwords do not match.'); return; }
    void user;
    const r = await useStore.getState().updateProfile({ currentPassword: f.current, newPassword: f.next });
    if (!r.ok) { setErr(r.error); return; }
    setF({ current: '', next: '', confirm: '' });
    toast({ text: 'Password changed' });
  };
  return (
    <form onSubmit={save} className="space-y-4" noValidate>
      <Field label="Current password"><input type="password" className="dash-input" value={f.current} onChange={up('current')} autoComplete="current-password" /></Field>
      <Field label="New password"><input type="password" className="dash-input" value={f.next} onChange={up('next')} autoComplete="new-password" /></Field>
      <Field label="Confirm new password"><input type="password" className="dash-input" value={f.confirm} onChange={up('confirm')} autoComplete="new-password" /></Field>
      {err && <p className="text-[12.5px] font-semibold text-[#B4432F]">{err}</p>}
      <button type="submit" className="dash-btn dash-btn-ghost w-full"><KeyRound />Update password</button>
    </form>
  );
}

export default function ProfilePage() {
  const user = useCurrentUser();
  const toast = useToast();
  const { saveAddress, removeAddress } = useStore.getState();
  const [editing, setEditing] = useState(null); // null | 'new' | address
  const [removing, setRemoving] = useState(null);
  if (!user) return null;

  return (
    <>
      <PageHeader kicker="Profile" title="Profile & addresses" sub="Keep your details up to date so orders and quotes reach the right place." />
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        <div className="space-y-6">
          <SectionCard title={user.type === 'retailer' ? 'Business & contact details' : 'Personal details'}
            action={<div className="flex items-center gap-2"><TypeBadge user={user} /><Pill meta={USER_STATUS[user.status]} /></div>}>
            <ProfileForm key={user.id} user={user} />
          </SectionCard>

          <SectionCard title="Address book" action={<button type="button" onClick={() => setEditing('new')} className="dash-btn dash-btn-navy !h-9"><Plus />Add address</button>}>
            {user.addresses.length ? (
              <ul className="grid sm:grid-cols-2 gap-3">
                {user.addresses.map((a) => (
                  <li key={a.id} className={`rounded-2xl border-[1.5px] p-4 flex flex-col ${a.isDefault ? 'border-emerald/50 bg-[#F2F8F5]' : 'border-[#E2DED2]'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3"><MapPin className="w-4 h-4 text-gold mt-0.5 shrink-0" /><AddressBlock address={a} /></div>
                      {a.isDefault && <span className="pill bg-emerald text-white shrink-0">Default</span>}
                    </div>
                    <div className="mt-4 pt-3 border-t border-navy/5 flex flex-wrap gap-x-4 gap-y-2 text-[12.5px] font-bold">
                      <button type="button" onClick={() => setEditing(a)} className="inline-flex items-center gap-1.5 text-navy hover:text-emerald"><Pencil className="w-3.5 h-3.5" />Edit</button>
                      {!a.isDefault && <button type="button" onClick={() => { saveAddress({ id: a.id, isDefault: true }); toast({ text: `${a.label} is now your default address` }); }} className="inline-flex items-center gap-1.5 text-navy hover:text-emerald"><Star className="w-3.5 h-3.5" />Make default</button>}
                      <button type="button" onClick={() => setRemoving(a)} className="inline-flex items-center gap-1.5 text-charcoal/50 hover:text-[#B4432F] ml-auto"><Trash2 className="w-3.5 h-3.5" />Remove</button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl bg-ivory p-6 text-center text-[13.5px] text-charcoal/60">No saved addresses yet. Add one for faster checkout.</div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Password"><PasswordForm user={user} /></SectionCard>
          <SectionCard title="Account">
            <dl className="space-y-3 text-[13.5px]">
              <div className="flex justify-between gap-3"><dt className="text-charcoal/55">Account type</dt><dd className="font-bold text-navy capitalize">{user.type}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-charcoal/55">Status</dt><dd className="font-bold text-navy">{USER_STATUS[user.status]?.label}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-charcoal/55">Member since</dt><dd className="font-bold text-navy">{fmtDate(user.createdAt)}</dd></div>
            </dl>
            {user.type === 'individual' && (
              <p className="mt-4 text-[12.5px] text-charcoal/55 flex gap-2"><UserRound className="w-4 h-4 shrink-0 text-gold" />Running a shop? Contact us to upgrade to a trade account for bulk pricing.</p>
            )}
          </SectionCard>
        </div>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} kicker="Address book" title={editing === 'new' ? 'Add address' : 'Edit address'} size="max-w-2xl">
        {editing && (
          <AddressForm
            initial={editing === 'new' ? { isDefault: !user.addresses.length } : editing}
            onCancel={() => setEditing(null)}
            onSubmit={(a) => { saveAddress(editing === 'new' ? a : { ...a, id: editing.id }); setEditing(null); toast({ text: 'Address saved' }); }}
          />
        )}
      </Modal>
      <Modal open={!!removing} onClose={() => setRemoving(null)} kicker="Address book" title="Remove this address?"
        footer={<>
          <button type="button" className="dash-btn dash-btn-ghost" onClick={() => setRemoving(null)}>Cancel</button>
          <button type="button" className="dash-btn dash-btn-danger" onClick={() => {
            const wasDefault = removing.isDefault;
            void wasDefault; // the server promotes another address to default
            removeAddress(removing.id);
            setRemoving(null); toast({ text: 'Address removed' });
          }}>Remove</button>
        </>}>
        {removing && <AddressBlock address={removing} />}
      </Modal>
    </>
  );
}
