import { FullPageLoader } from '@/components/Loading';

/** Shown while a page's code loads (first visit / slow connection). */
export default function Loading() {
  return <FullPageLoader />;
}
