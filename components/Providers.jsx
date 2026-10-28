'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useHydrateStore } from '@/lib/store';
import { productImg } from '@/lib/catalogue';

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

/**
 * toast({ html|text, product?, action?: { label, onClick } })
 * Same look as the home page toast (bottom-centre, navy pill).
 */
export default function Providers({ children }) {
  useHydrateStore();
  const [t, setT] = useState(null);
  const timer = useRef();
  const toast = useCallback((opts) => {
    clearTimeout(timer.current);
    setT({ ...opts, key: Date.now() });
    timer.current = setTimeout(() => setT(null), opts.duration || 3600);
  }, []);
  // API errors from fire-and-forget actions (lib/store.js) surface as a toast
  useEffect(() => {
    const onErr = (e) => toast({ text: e.detail, duration: 5000 });
    window.addEventListener('jolof:error', onErr);
    return () => window.removeEventListener('jolof:error', onErr);
  }, [toast]);
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div
        role="status"
        aria-live="polite"
        style={{ transform: t ? 'translate(-50%,0)' : 'translate(-50%,150%)', visibility: t ? 'visible' : 'hidden', transition: 'transform .5s var(--ease)' }}
        className="fixed left-1/2 bottom-[84px] lg:bottom-8 z-[120] w-[calc(100%-32px)] max-w-[440px]"
      >
        {t && (
          <div className="flex items-center gap-3 bg-navy text-white rounded-2xl shadow-[0_24px_60px_-20px_rgba(6,20,43,.7)] p-3 pr-4">
            {t.product ? (
              <img src={productImg(t.product)} alt="" className="w-12 h-12 rounded-xl object-contain bg-white p-1 shrink-0" />
            ) : (
              <span className="w-10 h-10 rounded-full bg-gold-soft text-navy grid place-items-center shrink-0 font-extrabold">✓</span>
            )}
            <p className="flex-1 text-[13.5px] leading-snug">{t.text}</p>
            {t.action && (
              <button type="button" onClick={() => { t.action.onClick(); setT(null); }} className="text-[12.5px] font-extrabold text-gold-soft hover:text-white whitespace-nowrap">
                {t.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastCtx.Provider>
  );
}
