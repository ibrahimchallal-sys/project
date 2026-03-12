import React from 'react';
import MainImage from '../assets/Main.jpg';
import '../css/HeroBackground.css';
import { Ship, Scan, Clock, ShieldCheck, ArrowRight } from 'lucide-react';

export default function HeroBackground() {
  const iconColor = "#1f93ff";
  

  return (
    <div className="hero-container">
      <div className="overlay"></div>
      <img className="background-image" src={MainImage} alt="Marsa Maroc Modern Port" />

      <div className="content-wrapper">
        <div className="hero-main">
          <div className="hero-tagline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Ship size={18} color={iconColor} />
            <span>Détection AI de Conteneurs</span>
          </div>
          <h1 className="title">
            Surveillance <span>Portuaire Intelligente</span>
          </h1>
          <p className="subtitle">
            Identifiez et suivez chaque conteneur en temps réel grâce à notre IA visionnaire.
            Contrôlez les entrées et sorties avec une précision absolue.
          </p>
          <div className="cta-group">
            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              Commencer le Scan <Scan size={20} />
            </button>
            <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              En savoir plus <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
          <Clock size={32} color={iconColor} />
          <div>
            <div className="card-stat">24/7</div>
            <div className="card-label">Services Disponibles</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShieldCheck size={32} color={iconColor} />
          <div>
            <div className="card-stat">99.9%</div>
            <div className="card-label">Précision de Scan</div>
          </div>
        </div>
      </div>
    </div>
  );
}
