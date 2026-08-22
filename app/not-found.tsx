import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="not-found">
      <p className="eyebrow">404 · Page not found</p>
      <h1>This page is outside the timechain.</h1>
      <p>The address may have changed, or the page may no longer exist.</p>
      <Link className="button button-primary" href="/">
        Return home <span aria-hidden="true">→</span>
      </Link>
    </main>
  );
}
