/** Shared layout for the plain text pages (privacy, terms): readable width, the app's paper. */
export function Prose({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '64px 24px 96px', lineHeight: 1.65, fontSize: 17 }}>
      <p style={{ margin: 0 }}>
        <a href="/" style={{ color: '#A09A8F', textDecoration: 'none' }}>
          SnitchDog
        </a>
      </p>
      <h1 style={{ fontSize: 40, letterSpacing: -1, margin: '8px 0 4px' }}>{title}</h1>
      <p style={{ color: '#A09A8F', marginTop: 0 }}>Last updated {updated}</p>
      {children}
    </main>
  );
}
