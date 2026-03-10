import React from 'react';
import '../css/Login.css';
import { Lock, User, Scan, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';

export default function Login() {
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // Simulated login redirection
    navigate('/');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <Scan size={48} strokeWidth={2.5} />
          </div>
          <h1 className="login-title">Marsa Scan <span>Admin</span></h1>
          <p className="login-subtitle">Connectez-vous pour accéder au panel de surveillance</p>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          <div className="input-group">
            <label className="input-label">
              <User size={16} color="white" />
              Utilisateur
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Identifiant administratif"
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">
              <Lock size={16} color="white" />
              Mot de passe
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              required
            />
          </div>

          <Button />
        </form>

        <div className="login-footer">
          <p>Besoin d'aide ? <a href="mailto:support@marsamaroc.ma">Contacter le support IT</a></p>
        </div>
      </div>
    </div>
  );
}
