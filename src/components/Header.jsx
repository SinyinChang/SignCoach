import { NavLink, Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="site-header">
      <Link to="/" className="brand-link" aria-label="SignCoach home">
        <span className="brand-mark">
          Sign<span>Coach</span>
        </span>
      </Link>
      <nav className="nav-links" aria-label="Primary">
        <NavLink to="/" end>
          Signs
        </NavLink>
      </nav>
    </header>
  );
}
