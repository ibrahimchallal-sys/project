import React from 'react';
import '../css/Footer.css';
import { Scan, Facebook, Twitter, Linkedin, Github, Send } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="footer-container">
            <div className="footer-content">
                <div className="footer-brand">
                    <div className="brand-text">
                        <Scan size={28} />
                        <span>MARSA SCAN</span>
                    </div>
                    <p>
                        Leader de l'innovation portuaire au Maroc. Nous utilisons l'intelligence artificielle
                        pour optimiser chaque mouvement de conteneur, garantissant fluidité et sécurité.
                    </p>
                </div>

                <div className="footer-links">
                    <h4>Navigation</h4>
                    <ul>
                        <li><a href="/home">Accueil</a></li>
                        <li><a href="/about">À propos</a></li>
                        <li><a href="/services">Services</a></li>
                    </ul>
                </div>

                <div className="footer-links">
                    <h4>Services</h4>
                    <ul>
                        <li><a href="#vision">Vision AI</a></li>
                        <li><a href="#ocr">OCR Reconnaissance</a></li>
                        <li><a href="#tracking">Tracking Flux</a></li>
                        <li><a href="#dashboard">Admin Dash</a></li>
                    </ul>
                </div>

                <div className="footer-newsletter">
                    <h4>Newsletter</h4>
                    <p style={{ marginBottom: '20px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>
                        Restez informé des dernières mises à jour technologiques.
                    </p>
                    <div className="newsletter-form">
                        <input type="email" placeholder="Votre email" />
                        <button><Send size={18} /></button>
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <p>&copy; 2026 Marsa Maroc. Tous droits réservés.</p>

            </div>
        </footer>
    );
}
