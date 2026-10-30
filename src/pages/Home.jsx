import SignCard from '../components/SignCard';
import { SIGNS } from '../data/signs';

export default function Home() {
  return (
    <div>
      <section className="hero" aria-labelledby="hero-brand">
        <h1 id="hero-brand" className="hero-brand">
          Sign<span>Coach</span>
        </h1>
        <p className="hero-tagline">Practice ASL with interactive feedback.</p>
        <p className="hero-note">
          Designed for independent ASL learners, including people with acquired
          or progressive hearing loss and hearing family members of Deaf and
          Hard-of-Hearing people. Watch a reference, practice with your webcam,
          and get specific feedback on your signing.
        </p>
      </section>

      <section aria-labelledby="choose-sign">
        <h2 id="choose-sign" className="section-title">
          Choose a sign to practice
        </h2>
        <p className="section-lead">
          This prototype supports a small set of beginner signs with specific
          feedback on handshape, position, movement, and palm orientation.
        </p>
        <div className="sign-grid">
          {SIGNS.map((sign) => (
            <SignCard key={sign.id} sign={sign} />
          ))}
        </div>
      </section>
    </div>
  );
}
