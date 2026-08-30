import Link from 'next/link';

// Scoped to the (app) route group (currently /surveys/* and /events/*) — the
// authenticated-authoring surface. The root layout's header stays wordmark-only
// per the frozen visual spec ("nothing else — no fake nav"); this slim bar
// beneath it is where the cross-linking nav lives, so public pages (/s/*,
// /e/*, home) never render it.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="border-b border-rule">
        <div className="max-w-2xl mx-auto px-4 py-2 flex justify-end">
          <nav className="flex items-center gap-4">
            <Link href="/surveys" className="text-pencil text-sm no-underline hover:text-ink">
              Surveys
            </Link>
            <Link href="/events" className="text-pencil text-sm no-underline hover:text-ink">
              Events
            </Link>
          </nav>
        </div>
      </div>
      {children}
    </>
  );
}
