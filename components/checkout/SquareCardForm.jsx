'use client';
// Square Web Payments SDK card form. Card numbers are typed into Square's own secure iframe —
// they never touch JOLOF's server. The parent calls ref.tokenize() to get a one-time token.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Lock } from 'lucide-react';

const APP_ID = process.env.NEXT_PUBLIC_SQUARE_APP_ID || '';
const LOCATION_ID = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || '';
const SANDBOX = APP_ID.startsWith('sandbox-');
const SDK_URL = SANDBOX ? 'https://sandbox.web.squarecdn.com/v1/square.js' : 'https://web.squarecdn.com/v1/square.js';

let sdkPromise = null;
function loadSdk() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.Square) return Promise.resolve(window.Square);
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SDK_URL;
      s.async = true;
      s.onload = () => (window.Square ? resolve(window.Square) : reject(new Error('Square SDK missing')));
      s.onerror = () => { sdkPromise = null; reject(new Error('Could not load Square')); };
      document.head.appendChild(s);
    });
  }
  return sdkPromise;
}

/**
 * <SquareCardForm ref={cardRef} locale="en-US" />
 * await cardRef.current.tokenize({ amount, billingContact }) → { token } or throws Error(message)
 */
const SquareCardForm = forwardRef(function SquareCardForm({ locale = 'en-US' }, ref) {
  const box = useRef(null);
  const card = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    if (!APP_ID || !LOCATION_ID) { setStatus('error'); setError('Card payments are not set up yet (missing Square application ID).'); return undefined; }
    (async () => {
      try {
        const Square = await loadSdk();
        const payments = Square.payments(APP_ID, LOCATION_ID);
        try { payments.setLocale(locale); } catch { /* unsupported locale → browser default */ }
        const c = await payments.card({ style: { '.input-container': { borderRadius: '12px' }, '.input-container.is-focus': { borderColor: '#0B2347' }, '.message-text': { color: '#6b7280' } } });
        if (!live) { c.destroy(); return; }
        await c.attach(box.current);
        card.current = c;
        setStatus('ready');
      } catch (e) {
        if (!live) return;
        console.error('[square card]', e);
        setStatus('error');
        setError('The card form could not load. Check your connection and refresh the page, or choose cash on delivery.');
      }
    })();
    return () => {
      live = false;
      if (card.current) { card.current.destroy().catch(() => {}); card.current = null; }
    };
  }, [locale]);

  useImperativeHandle(ref, () => ({
    ready: () => status === 'ready',
    async tokenize({ amount, billingContact } = {}) {
      if (!card.current) throw new Error('The card form is still loading — please wait a moment.');
      const details = amount
        ? { amount: Number(amount).toFixed(2), currencyCode: 'USD', intent: 'CHARGE', customerInitiated: true, sellerKeyedIn: false, billingContact: { countryCode: 'US', ...billingContact } }
        : undefined;
      const r = await card.current.tokenize(details);
      if (r.status === 'OK') return { token: r.token, verificationToken: r.verificationToken };
      const msg = r.errors?.map((e) => e.message).filter(Boolean).join(' ') || 'Please check your card details.';
      throw new Error(msg);
    },
  }), [status]);

  return (
    <div>
      <div ref={box} className={status === 'error' ? 'hidden' : 'min-h-[90px]'} />
      {status === 'loading' && <p className="text-[12.5px] text-charcoal/55 -mt-16 mb-12 px-1">Loading secure card form…</p>}
      {status === 'error' && <p role="alert" className="text-[13px] font-semibold text-[#B4432F] bg-[#F8E7E3] rounded-xl px-4 py-3">{error}</p>}
      <p className="mt-1 text-[11.5px] text-charcoal/55 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Secured by Square — card details never reach our servers.{SANDBOX ? ' (Test mode)' : ''}</p>
    </div>
  );
});

export default SquareCardForm;
