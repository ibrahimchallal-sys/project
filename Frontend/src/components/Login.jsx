import React, { useState } from 'react';
import '../css/Login.css';
import { Lock, User, Scan, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      // NOTE: Update port if your backend runs on a different port. Assuming 82 here based on Database.js
      const response = await fetch('http://localhost:82/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        // IMPORTANT: include credentials so that the session cookie is saved
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        navigate('/dashboard');
      } else {
        setError(data.message || 'Identifiants invalides');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
    }
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
          {error && <div style={{ color: '#ff4d4d', textAlign: 'center', marginBottom: '15px' }}>{error}</div>}
          <div className="input-group">
            <label className="input-label">
              <User size={16} color="white" />
              Utilisateur / Email
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Ex: ibrahimchallal@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
