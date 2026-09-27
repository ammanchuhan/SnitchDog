/** The server has no product surface — the app is the product. This page exists so the
 *  deployment has a root, and so a witness who opens the invite link on a laptop sees something. */
export default function Page() {
  return (
    <main style={{ maxWidth: 520, margin: '18vh auto', padding: '0 24px', lineHeight: 1.6 }}>
      <h1 style={{ fontSize: 44, letterSpacing: -1.5, margin: 0 }}>SnitchDog</h1>
      <p style={{ color: '#A09A8F' }}>
        One promise, one witness. If you go quiet, they hear about it.
      </p>
      <p style={{ color: '#6E6960', fontSize: 14 }}>
        This is the service the app talks to. Open your invite on your phone.
      </p>
    </main>
  );
}
