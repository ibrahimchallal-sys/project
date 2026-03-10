import React from 'react';
import Logo from '../assets/logo2.png';
import '../css/Navbar.css'
import { useNavigate } from 'react-router-dom';
import { Scan } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const brandIconColor = "#1f93ff";

  return (
    <nav className="navbar-container">
      <div className="navbar-content">
        <div className="logo-section" onClick={() => navigate('/home')}>
          <img className="logo-image" src={Logo} alt="Marsa Maroc Logo" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="brand-name">MARSA SCAN</span>
          </div>
        </div>

        <ul className="nav-links">
          <li>
            <button className="nav-link" onClick={() => navigate('/home')}>Home</button>
          </li>
          <li>
            <button className="nav-link" onClick={() => navigate('/about')}>À propos</button>
          </li>
          <li>
            <button className="nav-link" onClick={() => navigate('/services')}>Services</button>
          </li>
        </ul>

        <button className="get-started-button" onClick={() => navigate('/login')}>Login</button>
      </div>
    </nav>
  );
}
