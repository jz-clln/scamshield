export default function AboutPage() {
  return (
    <div className="max-w-content mx-auto px-5 py-12 space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-gabi">
          What ScamShield does
        </h1>
        <p className="text-gabi/70 mt-2">
          ScamShield reads a screenshot or pasted message, checks it against
          common scam patterns, and explains what it found in plain language
          — warning signs, a concern level, and what to do next.
        </p>
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold text-gabi">
          System limitations
        </h2>
        <p className="text-gabi/70 mt-2">
          ScamShield analyzes the message itself. It cannot confirm the real
          identity of a sender, and a low concern result is not a guarantee
          that a message is safe. Always verify unexpected requests for
          money or personal information through a channel you already trust.
        </p>
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold text-gabi">
          Privacy
        </h2>
        <p className="text-gabi/70 mt-2">
          Messages and screenshots are sent to ScamShield only to produce
          your analysis and are not stored by default.
        </p>
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold text-gabi">
          Basic safety reminders
        </h2>
        <ul className="list-disc list-inside text-gabi/70 mt-2 space-y-1">
          <li>Never share an OTP, password, or PIN with anyone.</li>
          <li>Verify payment requests using a previously known contact.</li>
          <li>Be cautious with links in unexpected messages.</li>
        </ul>
      </div>
    </div>
  );
}
