import { NextResponse } from 'next/server';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const fail = (status, message) => { throw new HttpError(status, message); };
export const json = (data, status = 200) => NextResponse.json(data, { status });

/** Wrap a route handler: parses errors into { ok:false, error } responses. */
export const route = (fn) => async (req, ctx) => {
  try {
    const res = await fn(req, ctx);
    return res instanceof Response ? res : json({ ok: true, ...(res || {}) });
  } catch (e) {
    if (e instanceof HttpError) return json({ ok: false, error: e.message }, e.status);
    console.error('[api]', e);
    return json({ ok: false, error: 'Something went wrong. Please try again.' }, 500);
  }
};

export async function body(req) {
  try { return await req.json(); } catch { return {}; }
}

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
export const str = (v, max = 500) => String(v ?? '').trim().slice(0, max);
export const int = (v, min = 0) => Math.max(min, parseInt(v, 10) || 0);
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
