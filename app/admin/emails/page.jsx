'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, Mail, Send, XCircle } from 'lucide-react';
import { PageHeader, Tabs } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { Card, Skeleton } from '@/components/admin/common';
import { EmailRows, useEmailLog } from '@/components/admin/EmailLogCard';

const TABS = [{ value: '', label: 'All' }, { value: 'failed', label: 'Failed' }, { value: 'skipped', label: 'Not sent' }, { value: 'sent', label: 'Sent' }];

/** SMTP status + test send. */
function SmtpCard() {
  const toast = useToast();
  const [st, setSt] = useState(null);
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch('/api/admin/emails/test', { credentials: 'same-origin' }).then((r) => r.json()).then(setSt).catch(() => setSt({ ok: false })); }, []);
  const test = async () => {
    setBusy(true);
    const r = await fetch('/api/admin/emails/test', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to }) }).then((x) => x.json()).catch(() => ({ ok: false, error: 'Could not reach the server.' }));
    setBusy(false);
    toast({ text: r.ok ? `Test email sent to ${r.to}` : r.error });
  };
  return (
    <Card title="Email sending (SMTP)" action={<Mail className="w-4 h-4 text-gold" />}>
      {!st ? <p className="text-[13px] text-charcoal/55">Checking…</p> : (
        <>
          <p className={`flex items-center gap-2 text-[13.5px] font-bold ${st.connected ? 'text-emerald' : 'text-[#B4432F]'}`}>
            {st.connected ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {st.connected ? 'Connected — emails are being sent' : st.configured ? 'SMTP login failed' : 'Not set up — emails are logged but not sent'}
          </p>
          {st.error && <p className="text-[12px] text-[#B4432F] mt-1 break-words">{st.error}</p>}
          <dl className="mt-3 text-[12.5px] space-y-1 text-charcoal/70">
            <div><dt className="inline font-semibold">From: </dt><dd className="inline">{st.from || '—'}</dd></div>
            <div><dt className="inline font-semibold">Staff notifications to: </dt><dd className="inline">{st.adminTo || 'store email (Settings)'}</dd></div>
            <div><dt className="inline font-semibold">Links point to: </dt><dd className="inline">{st.appUrl}</dd></div>
          </dl>
          {!st.configured && <p className="text-[12px] text-charcoal/55 mt-3">Add <code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code>, <code>MAIL_FROM</code>, <code>ADMIN_NOTIFY_EMAIL</code> and <code>APP_URL</code> to the server&apos;s <code>.env</code>, then restart.</p>}
          <div className="flex gap-2 mt-4">
            <input className="dash-input" type="email" placeholder="Send a test to… (default: you)" value={to} onChange={(e) => setTo(e.target.value)} />
            <button className="dash-btn dash-btn-navy shrink-0" disabled={busy || !st.configured} onClick={test}><Send /> Test</button>
          </div>
        </>
      )}
    </Card>
  );
}

export default function EmailsPage() {
  const [status, setStatus] = useState('');
  const { rows, reload } = useEmailLog(status ? `status=${status}&take=200` : 'take=200');
  return (
    <>
      <PageHeader kicker="Communication" title="Emails" sub="Every email the site sends to customers and your team — order updates, quotes, payment links and receipts. Click one to preview it; re-send anything that failed." />
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start">
        <Card pad={false} title="Email log" action={<Tabs value={status} onChange={setStatus} tabs={TABS} />}>
          {rows === null ? <div className="p-5"><Skeleton /></div> : rows.length ? <EmailRows rows={rows} onResent={reload} /> : <p className="p-5 text-[13px] text-charcoal/55">No emails here yet.</p>}
        </Card>
        <SmtpCard />
      </div>
    </>
  );
}
