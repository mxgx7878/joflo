// Outgoing email over SMTP (nodemailer). Every message is written to EmailLog first, so admins
// can see what went out and re-send anything that failed.
//
// Env:
//   SMTP_HOST, SMTP_PORT (465 = SSL, 587 = STARTTLS), SMTP_USER, SMTP_PASS, SMTP_SECURE (optional)
//   MAIL_FROM           "JOLOF TRADING <orders@joloftradescenter.com>" (defaults to SMTP_USER)
//   ADMIN_NOTIFY_EMAIL  where staff notifications go (comma-separated; defaults to the store email)
//   APP_URL             public site URL used in links, e.g. https://joloftradescenter.com
// Without SMTP settings emails are not sent — they are logged as "skipped" so nothing breaks.
import nodemailer from 'nodemailer';
import { after } from 'next/server';
import { prisma } from './db';
import { fail } from './http';

export const smtpConfigured = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter = null;
function transport() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 465;
    const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port, secure,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000,
    });
  }
  return transporter;
}

const fromAddress = () => process.env.MAIL_FROM || (process.env.SMTP_USER ? `JOLOF TRADING <${process.env.SMTP_USER}>` : 'JOLOF TRADING <no-reply@localhost>');

/** Staff inbox(es) for notifications. */
export const adminRecipients = (settings) => (process.env.ADMIN_NOTIFY_EMAIL || settings?.store?.email || '').split(',').map((s) => s.trim()).filter(Boolean);

async function send(log, replyTo) {
  if (!smtpConfigured()) {
    await prisma.emailLog.update({ where: { id: log.id }, data: { status: 'skipped', error: 'SMTP is not configured (SMTP_HOST / SMTP_USER / SMTP_PASS).' } });
    return false;
  }
  try {
    await transport().sendMail({ from: fromAddress(), to: log.to, subject: log.subject, html: log.html, text: log.text || undefined, ...(replyTo ? { replyTo } : {}) });
    await prisma.emailLog.update({ where: { id: log.id }, data: { status: 'sent', error: '', sentAt: new Date() } });
    return true;
  } catch (e) {
    console.error('[mail] send failed', log.template, log.to, e?.message);
    await prisma.emailLog.update({ where: { id: log.id }, data: { status: 'failed', error: String(e?.message || e).slice(0, 2000) } });
    return false;
  }
}

/** Log + send one email. Never throws on SMTP errors (they're logged). */
export async function deliver({ to, subject, html, text = '', template, orderId = null, inquiryId = null, replyTo }) {
  const list = (Array.isArray(to) ? to : [to]).map((x) => String(x || '').trim()).filter(Boolean);
  const out = [];
  for (const addr of list) {
    const log = await prisma.emailLog.create({ data: { to: addr, subject, template, status: 'sending', html, text, orderId, inquiryId } });
    await send(log, replyTo);
    out.push(await prisma.emailLog.findUnique({ where: { id: log.id }, select: { id: true, status: true, error: true } }));
  }
  return out;
}

/** Re-send a logged email to the same address. */
export async function resendEmail(id) {
  const log = await prisma.emailLog.findUnique({ where: { id } });
  if (!log) fail(404, 'Email not found.');
  if (!smtpConfigured()) fail(400, 'SMTP is not configured yet — add the SMTP settings to .env first.');
  const ok = await send(log);
  if (!ok) fail(502, 'The email could not be sent — check the error in the email log.');
}

/** Check the SMTP login without sending anything. */
export async function verifySmtp() {
  if (!smtpConfigured()) return { ok: false, error: 'SMTP is not configured (SMTP_HOST / SMTP_USER / SMTP_PASS).' };
  try { await transport().verify(); return { ok: true }; } catch (e) { return { ok: false, error: String(e?.message || e) }; }
}

/**
 * Run an email job after the response is sent (so a slow SMTP server never slows checkout).
 * Outside a request (scripts) it just runs.
 */
export function later(label, job) {
  const run = () => Promise.resolve().then(job).catch((e) => console.error('[mail]', label, e));
  try { after(run); } catch { run(); }
}
