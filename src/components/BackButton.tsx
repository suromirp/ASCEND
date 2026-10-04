import { useNavigate } from 'react-router-dom';

// Back to where you came from, or to Meer when the page was opened directly
// (a link, a bookmark): navigate(-1) would then leave the app.
export function BackButton({ fallback = '/more' }: { fallback?: string }) {
  const navigate = useNavigate();
  const canGoBack = typeof window !== 'undefined' && ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0;
  return (
    <button
      onClick={() => (canGoBack ? navigate(-1) : navigate(fallback))}
      aria-label="Terug"
      className="-ml-3 flex h-11 w-11 items-center justify-center text-2xl"
      style={{ color: 'var(--color-ink-dim)' }}
    >
      ‹
    </button>
  );
}
