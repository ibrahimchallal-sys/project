import React from 'react';
import '../css/About.css';
import { Info, HelpCircle, List, TrendingUp, CheckCircle, ArrowRight } from 'lucide-react';

export default function About() {
  const iconColor = "#1f93ff";

  return (
    <div className="about-page">
      <div className="about-container">

        {/* Header section remains perfectly centered */}
        <header className="about-header">
          <span className="header-tag">Notre Solution AI</span>
          <h1 className="about-title">Tracking Intelligent des <span>Flux Portuaires</span></h1>
          <p className="about-subtitle">
            Une technologie de vision par ordinateur conçue pour automatiser l'identification
            et le suivi des conteneurs (OCR) via les caméras de surveillance du port.
          </p>
        </header>

        {/* Content grid using the new perfectly centered cards */}
        <div className="about-grid">

          {/* Card 1: Our Mission */}
          <div className="about-card">
            <div className="card-icon">
              <Info size={32} strokeWidth={2} />
            </div>
            <h2 className="card-title">Concept AI</h2>
            <p className="card-text">
              Notre IA détecte instantanément les codes de conteneurs
              capturés par les caméras, permettant un contrôle total des mouvements
              d'entrée et de sortie sans intervention humaine.
            </p>
          </div>

          {/* Card 2: Methodology */}
          <div className="about-card">
            <div className="card-icon">
              <HelpCircle size={32} strokeWidth={2} />
            </div>
            <h2 className="card-title">Processus Admin</h2>
            <ul className="step-list">
              <li className="step-item">
                <span className="step-num">1</span>
                <span className="card-text">Capture caméra au point de passage</span>
              </li>
              <li className="step-item">
                <span className="step-num">2</span>
                <span className="card-text">Extraction AI du code conteneur</span>
              </li>
              <li className="step-item">
                <span className="step-num">3</span>
                <span className="card-text">Alerte admin et log du mouvement (In/Out)</span>
              </li>
            </ul>
          </div>

          {/* Card 3: Key Capacities */}
          <div className="about-card">
            <div className="card-icon">
              <List size={32} strokeWidth={2} />
            </div>
            <h2 className="card-title">Outils de Gestion</h2>
            <div className="feature-pills">
              {[
                "Logs Entrée/Sortie",
                "Dashboards Admin",
                "Alertes Instantanées",
                "Recherche par Code",
                "Vision Nocturne AI",
                "Export Rapports"
              ].map((pill, i) => (
                <div key={i} className="feature-pill">
                  <CheckCircle size={14} color={iconColor} />
                  {pill}
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Performance */}
          <div className="about-card">
            <div className="card-icon">
              <TrendingUp size={32} strokeWidth={2} />
            </div>
            <h2 className="card-title">Performance</h2>
            <p className="card-text">
              Nous garantissons une augmentation de 40% de la productivité
              opérationnelle grâce à la suppression des erreurs manuelles.
            </p>
          </div>

        </div>

        {/* Footer section centered at the bottom */}
        <footer className="about-footer">
          <h2 className="footer-title">Prêt à moderniser vos opérations portuaires ?</h2>
          <a href="/login" className="footer-btn">
            Découvrir nos services
            <ArrowRight size={20} />
          </a>
        </footer>

      </div>
    </div>
  );
}
