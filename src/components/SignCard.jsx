import { Link } from 'react-router-dom';

export default function SignCard({ sign }) {
  return (
    <article className="sign-card">
      <span className="badge">{sign.difficulty}</span>
      <h3>{sign.name}</h3>
      <p>{sign.shortDescription}</p>
      <div className="btn-row" style={{ marginTop: 0 }}>
        <Link className="btn btn-primary" to={`/sign/${sign.id}`}>
          Practice
        </Link>
      </div>
    </article>
  );
}
