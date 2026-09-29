import { Prose } from '../prose';

export const metadata = { title: 'Privacy policy · SnitchDog' };

/** What SnitchDog stores, where, and who sees it. Kept in step with the requirements' data table;
 *  if the app starts storing something new, this page changes in the same commit. */
export default function Privacy() {
  return (
    <Prose title="Privacy policy" updated="29 September 2026">
      <p>
        SnitchDog helps you keep a promise to yourself: weigh in three mornings a week, do the workouts you planned, and
        let up to three people you pick (your witnesses) hear about it if you stop. This page says exactly what that
        takes.
      </p>

      <h2>What stays on your phone</h2>
      <ul>
        <li>
          <b>Mirror photos.</b> Stored only in the app on your phone. Never uploaded, never seen by us, by the AI coach
          or by your witnesses. If you turn on “Also save to my Photos”, a copy goes to your Photos library.
        </li>
        <li>
          <b>Your location.</b> The phone watches for arriving at and leaving the gym you pinned. Only “arrived” and
          “left” are worked out, on the phone; no location trail is ever sent to us.
        </li>
        <li>
          <b>Witness names</b>, until each witness accepts your invite.
        </li>
      </ul>

      <h2>Scale photos</h2>
      <p>
        To read your weigh-in, a small copy of the scale photo is sent to our server and read by
        Anthropic’s Claude. Only the number comes back. The photo isn’t stored anywhere, by us or in the
        app, and it’s deleted from your phone as soon as it’s read. Without a connection, your phone reads
        it itself and nothing is sent.
      </p>

      <h2>What we store on our server</h2>
      <ul>
        <li>Your account: email address and a hashed password, or your Sign in with Apple identifier.</li>
        <li>
          Your plan: first name, age, height, weight at the start, target weight, optional gender, workout days and
          times, the gym’s pin, your daily step goal, and Snitch’s style.
        </li>
        <li>Your weigh-ins: the date, the number, and whether it was read from a photo or typed.</li>
        <li>Workouts: the date, whether it was verified at the gym and for how many minutes, or missed.</li>
        <li>Your daily step total, from Apple Health: one number a day.</li>
        <li>Your chat with Snitch, and the short notes Snitch keeps about you (you can see and delete them in Profile).</li>
        <li>
          Witnesses: an invite code each, and once they accept, their Telegram chat id, the name Telegram gives, and the
          name you gave them.
        </li>
        <li>A push notification token for your phone.</li>
      </ul>

      <h2>Who sees what</h2>
      <p>
        <b>Your witnesses</b> only ever learn whether you showed up: that a week ended with fewer than three weigh-ins,
        that you missed two workouts in a row, that you paused (with the reason you picked from a list), removed a
        witness, or left. They never see your weight, your photos, your chats, your streak or who the other witnesses
        are. Nothing you type is ever forwarded to them.
      </p>
      <p>
        <b>The AI coach.</b> Snitch’s replies are written by Anthropic’s Claude. To write them we send the relevant
        parts of your plan and history, your chat messages and Snitch’s notes about you, and the scale photo when
        reading a weigh-in. Your weight history is never sent to the model. Anthropic doesn’t use API data to train its models.
      </p>
      <p>
        <b>Service providers</b> we use to run SnitchDog: Vercel (hosting), Neon (database), Anthropic (the coach),
        Telegram (messages to witnesses), Expo and Apple (push notifications) and Resend (password reset emails). We
        don’t sell your data, and there are no ads or analytics trackers in the app.
      </p>

      <h2>Deleting it</h2>
      <p>
        Profile › Account and data › Delete my account erases everything we store about you, immediately. Your
        witnesses are told first (that you left, or that you reached your goal). Signing out or deleting also removes
        the mirror photos from your phone.
      </p>

      <h2>Age</h2>
      <p>SnitchDog is for adults, 18 and over.</p>

      <h2>Contact</h2>
      <p>
        <a href="mailto:hello@snitchdog.com" style={{ color: '#F6F4EF' }}>
          hello@snitchdog.com
        </a>
      </p>
    </Prose>
  );
}
