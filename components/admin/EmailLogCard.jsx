'use client';
// Emails sent for one order / inquiry (or the whole log), with preview and re-send.
import { useCallback, useEffect, useState } from 'react';
import { Mail, RefreshCw, Send } from 'lucide-react';
import { fmtDateTime, EMAIL_STATUS } from '@/lib/format';
import { Pill, Modal } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { Card } from './common';

export function useEmailLog(query = '') {
  const [rows, setRows] = useState(null);
  const [smtp, setSmtp] = useState(true);
  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/emails${query ? `?${query}` : ''}`, { credentials: 'same-origin' });
      const j = await r.json();
      if (j.ok) { setRows(j.emails); setSmtp(j.smtp); } else setRows([]);
    } catch { setRows([]); }
  }, [query]);
  useEffect(() => { load(); }, [load]);
  return { rows, smtp, reload: load };
}

export function EmailPreview({ id, onClose }) {
  const [email, setEmail] = useState(null);
  useEffect(() => {
    if (!id) return;
    setEmail(null);
    fetch(`/api/admin/emails/${id}`, { credentials: 'same-origin' }).then((r) => r.json()).then((j) => setEmail(j.email || null)).catch(() => {});
  }, [id]);
  return (
    <Modal open={!!id} onClose={onClose} kicker={email ? `To ${email.to}` : 'Email'} title={email?.subject || 'Loading…'} size="max-w-3xl">
      {email ? <iframe title="Email preview" srcDoc={email.html} sandbox="" className="w-full h-[65vh] rounded-xl border border-navy/10 bg-white" /> : <p className="text-[13px] text-charcoal/55">Loading…</p>}
      {email?.error && <p className="mt-3 text-[12.5px] font-semibold text-[#B4432F] bg-[#F8E7E3] rounded-xl px-3 py-2">{email.error}</p>}
    </Modal>
  );
}

/** Row list shared by the card and the full page. */
export function EmailRows({ rows, onResent, compact = false }) {
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const [preview, setPreview] = useState(null);
  const resend = async (e) => {
    setBusy(e.id);
    const r = await fetch(`/api/admin/emails/${e.id}`, { method: 'POST', credentials: 'same-origin' }).then((x) => x.json()).catch(() => ({ ok: false, error: 'Could not reach the server.' }));
    setBusy(null);
    toast({ text: r.ok ? `Email sent again to ${e.to}` : r.error });
    onResent?.();
  };
  return (
    <>
      <ul className="divide-y divide-navy/5">
        {rows.map((e) => (
          <li key={e.id} className={`py-2.5 ${compact ? '' : 'px-5'} flex items-start gap-3`}>
            <Mail className="w-4 h-4 text-navy/35 mt-0.5 shrink-0" />
            <button type="button" className="flex-1 min-w-0 text-left" onClick={() => setPreview(e.id)}>
              <p className="text-[13px] font-bold text-navy truncate hover:text-emerald">{e.subject}</p>
              <p className="text-[11.5px] text-charcoal/55 truncate">{e.to} · {fmtDateTime(e.createdAt)}</p>
              {e.status === 'failed' && e.error && <p className="text-[11.5px] text-[#B4432F] truncate" title={e.error}>{e.error}</p>}
            </button>
            <span className="flex items-center gap-1.5 shrink-0">
              <Pill meta={EMAIL_STATUS[e.status] || EMAIL_STATUS.sending} />
              {e.status !== 'sending' && <button type="button" className="icon-btn !w-8 !h-8" disabled={busy === e.id} onClick={() => resend(e)} aria-label="Send again" title="Send again"><Send className="w-3.5 h-3.5" /></button>}
            </span>
          </li>
        ))}
      </ul>
      <EmailPreview id={preview} onClose={() => setPreview(null)} />
    </>
  );
}

/** Card on the admin order / inquiry page. */
export default function EmailLogCard({ orderId, inquiryId }) {
  const query = orderId ? `orderId=${encodeURIComponent(orderId)}` : `inquiryId=${encodeURIComponent(inquiryId)}`;
  const { rows, smtp, reload } = useEmailLog(query);
  return (
    <Card title="Emails" action={<button type="button" onClick={reload} className="text-charcoal/45 hover:text-navy" aria-label="Refresh emails"><RefreshCw className="w-4 h-4" /></button>} className="print:hidden">
      {!smtp && <p className="text-[12px] mb-2 rounded-xl bg-gold-pale text-[#8a6417] px-3 py-2">SMTP isn&apos;t set up yet, so emails are logged but not sent.</p>}
      {rows === null ? <p className="text-[12.5px] text-charcoal/50">Loading…</p>
        : rows.length ? <EmailRows rows={rows} onResent={reload} compact />
          : <p className="text-[12.5px] text-charcoal/50">No emails yet.</p>}
    </Card>
  );
}
