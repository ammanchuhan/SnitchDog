/** snitchdog.com: one page saying what this is, for anyone who follows a link here (a witness
 *  opening an invite on a laptop, someone reading the App Store listing). The app is the product. */
export default function Page() {
  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '10vh 24px 80px', lineHeight: 1.6, textAlign: 'center' }}>
      <img src="/snitch.png" alt="Snitch, a German Shepherd in a white tank top with a whistle" width={123} height={220} />
      <h1 style={{ fontSize: 48, letterSpacing: -1.5, margin: '16px 0 0' }}>SnitchDog</h1>
      <p style={{ fontSize: 20, color: '#D9D4CA', margin: '8px 0 32px' }}>
        An AI can’t hold you accountable. The people you respect can.
      </p>
      <div style={{ textAlign: 'left', color: '#A09A8F', fontSize: 17 }}>
        <p>
          You set a weight goal and build a workout plan with Snitch. Three mornings a week you weigh in; your phone
          reads the scale. Workouts count when your phone sees you at the gym.
        </p>
        <p>
          You name one to three people as your witnesses. Keep your word and they never hear a thing. Go quiet, and
          Snitch tells them.
        </p>
        <p>
          Got an invite from a friend? Open it on your phone: it takes you to Telegram, and that’s all you need.
        </p>
      </div>
      <p style={{ marginTop: 40, color: '#6E6960', fontSize: 14 }}>
        iPhone, in testing now ·{' '}
        <a href="/privacy" style={{ color: '#A09A8F' }}>
          Privacy
        </a>{' '}
        ·{' '}
        <a href="/terms" style={{ color: '#A09A8F' }}>
          Terms
        </a>{' '}
        ·{' '}
        <a href="mailto:hello@snitchdog.com" style={{ color: '#A09A8F' }}>
          hello@snitchdog.com
        </a>
      </p>
    </main>
  );
}
