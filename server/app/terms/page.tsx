import { Prose } from '../prose';

export const metadata = { title: 'Terms · SnitchDog' };

export default function Terms() {
  return (
    <Prose title="Terms" updated="28 September 2026">
      <p>By using SnitchDog you agree to these terms. They’re short on purpose.</p>

      <h2>Not medical advice</h2>
      <p>
        SnitchDog helps you keep a promise to yourself. It isn’t a doctor, a dietitian or a therapist, and nothing it
        says (including what the AI coach writes) is medical, diet or nutrition advice. Talk to a doctor before
        starting a new exercise or weight plan, especially if you have a health condition. If food or your body feels
        hard to deal with, please talk to someone:{' '}
        <a href="https://findahelpline.com/topics/eating-body-image" style={{ color: '#F6F4EF' }}>
          findahelpline.com
        </a>
        .
      </p>

      <h2>You’re 18 or over</h2>
      <p>SnitchDog is for adults.</p>

      <h2>Your witnesses</h2>
      <p>
        Only invite people who’d want to be asked, and only people you know. They agree to hear from SnitchDog by
        tapping your invite, and they can stop at any time by sending /stop.
      </p>

      <h2>What SnitchDog does</h2>
      <p>
        It asks you to weigh in, checks your workouts at the gym you pinned, and tells your witnesses when a week comes
        up short or you miss two workouts in a row. It does what it says, and nothing more: it can be wrong (GPS
        drifts, a photo gets misread), so if something looks off, tell the coach or email us.
      </p>

      <h2>The service</h2>
      <p>
        SnitchDog is provided as it is, while it’s being tested. We may change or stop it, and we’ll say so in the app
        first. You can delete your account at any time from Profile.
      </p>

      <h2>Contact</h2>
      <p>
        <a href="mailto:hello@snitchdog.com" style={{ color: '#F6F4EF' }}>
          hello@snitchdog.com
        </a>
      </p>
    </Prose>
  );
}
