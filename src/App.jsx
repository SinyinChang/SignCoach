import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Tutorial from './pages/Tutorial';
import Practice from './pages/Practice';
import Feedback from './pages/Feedback';
import Wizard from './pages/Wizard';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <Header />
        <main id="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/sign/:signId" element={<Tutorial />} />
            <Route path="/practice/:signId" element={<Practice />} />
            <Route path="/feedback/:signId" element={<Feedback />} />
            <Route path="/wizard" element={<Wizard />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
