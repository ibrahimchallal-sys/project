import React from 'react';
import '../css/Services.css';
import { Camera, Scan, LogIn, Database, ShieldCheck, Activity, ArrowRight } from 'lucide-react';

export default function Services() {
    const services = [
        {
            icon: <Camera size={35} />,
            title: "Vision par Ordinateur",
            desc: "Détection automatique des conteneurs via les flux vidéo haute résolution du port.",
            tag: "AI Core"
        },
        {
            icon: <Scan size={35} />,
            title: "Reconnaissance OCR",
            desc: "Extraction instantanée des codes BIC avec 99.9% de précision.",
            tag: "Smart Engine"
        },
        {
            icon: <LogIn size={35} />,
            title: "Gestion des Flux",
            desc: "Logging automatisé de chaque mouvement d'entrée et de sortie des actifs.",
            tag: "Real-time"
        },
        {
            icon: <Database size={35} />,
            title: "Base de Données",
            desc: "Historisation sécurisée de tous les scans pour une traçabilité douanière complète.",
            tag: "Secure Storage"
        },
        {
            icon: <ShieldCheck size={35} />,
            title: "Contrôle Sécurisé",
            desc: "Vérification automatisée des autorisations d'accès aux zones restreintes.",
            tag: "Enterprise"
        },
        {
            icon: <Activity size={35} />,
            title: "Dashboards Analytiques",
            desc: "Visualisation des statistiques de performance et des goulots d'étranglement.",
            tag: "Analytics"
        }
    ];

    return (
        <div className="services-page">
            <div className="services-container">
                <header className="services-header">
                    <h1 className="services-title">Nos <span>Services AI</span></h1>
                    <p className="services-subtitle">
                        Une suite technologique complète pour automatiser et sécuriser
                        la gestion des conteneurs au sein de Marsa Maroc.
                    </p>
                </header>

                <div className="services-grid">
                    {services.map((service, index) => (
                        <div className="service-card" key={index} style={{ animationDelay: `${index * 0.1}s` }}>
                            <div className="service-icon">
                                {service.icon}
                            </div>
                            <h2 className="service-name">{service.title}</h2>
                            <p className="service-description">{service.desc}</p>
                            <span className="service-tag">{service.tag}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
