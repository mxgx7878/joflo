'use client';
// Image field used across the dashboards: upload a file to S3 (jolof/<folder>/…) or paste a link.
import { useRef, useState } from 'react';
import { Link2, Loader2, Upload, X } from 'lucide-react';

const MAX = 5 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/avif';

/** Upload one image; resolves to its public URL. */
export async function uploadImageFile(file, folder) {
  if (!file) throw new Error('Choose an image.');
  if (file.size > MAX) throw new Error('Image is too large — the limit is 5 MB.');
  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder', folder);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || 'Upload failed. Please try again.');
  return data.url;
}

/**
 * value / onChange: the image URL (or catalogue image name) stored on the record.
 * folder: S3 sub-folder under jolof/ — products | departments | commodities | product-requests
 * preview: optional (value) => src for the thumbnail (e.g. productImg)
 */
export function ImageInput({ value, onChange, folder = 'products', preview, placeholder = 'https://…', compact = false }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [drag, setDrag] = useState(false);
  const src = value ? (preview ? preview(value) : value) : '';

  const pick = async (file) => {
    if (!file) return;
    setErr(''); setBusy(true);
    try { onChange(await uploadImageFile(file, folder)); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
      className={`rounded-xl transition ${drag ? 'ring-2 ring-gold ring-offset-2' : ''}`}
    >
      <div className="flex items-center gap-3">
        {!compact && (
          <div className="w-16 h-16 rounded-xl bg-ivory border border-navy/5 grid place-items-center overflow-hidden shrink-0">
            {busy ? <Loader2 className="w-5 h-5 animate-spin text-navy/40" />
              : src ? <img src={src} alt="" className="w-full h-full object-contain" />
              : <Upload className="w-5 h-5 text-navy/25" />}
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="relative">
            <Link2 className="w-4 h-4 text-navy/35 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input className="dash-input !pl-9 !pr-9" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label="Image link" />
            {value && (
              <button type="button" onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 grid place-items-center rounded-full text-navy/40 hover:text-navy hover:bg-ivory" aria-label="Remove image"><X className="w-3.5 h-3.5" /></button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" className="dash-btn dash-btn-ghost !h-9" disabled={busy} onClick={() => fileRef.current?.click()}>
              {busy ? <Loader2 className="animate-spin" /> : <Upload />} {busy ? 'Uploading…' : 'Upload image'}
            </button>
            <span className="text-[11.5px] text-charcoal/50">JPG, PNG or WebP · max 5 MB · or drop a file here</span>
          </div>
          {err && <p className="text-[12.5px] font-bold text-[#B4432F]">{err}</p>}
        </div>
      </div>
      <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}
