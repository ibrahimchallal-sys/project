import React from 'react';
import '../css/Workflow.css';
import { Camera, Search, UserCheck, BarChart3 } from 'lucide-react';

export default function Workflow() {
    const steps = [
        {
            icon: <Camera size={38} />,
            title: "Capture Vidéo",
            desc: "Les caméras haute résolution positionnées aux accès détectent le passage d'un conteneur."
        },
        {
            icon: <Search size={38} />,
            title: "Analyse OCR",
            desc: "L'IA extrait instantanément le code d'identification unique (BIC) dès qu'il est visible."
        },
        {
            icon: <UserCheck size={38} />,
            title: "Validation Admin",
            desc: "L'information est transmise au tableau de bord pour une vérification des accès."
        },
        {
            icon: <BarChart3 size={38} />,
            title: "Reporting",
            desc: "Le mouvement est historisé pour une traçabilité parfaite des flux d'entrée/sortie."
        }
    ];

    return (
        <section className="workflow-section">
            <div className="workflow-header">
                <h2>Comment ça <span>Marche ?</span></h2>
                <p>Un processus automatisé de bout en bout pour une gestion portuaire simplifiée et sécurisée.</p>
            </div>
            <div className="workflow-steps">
                {steps.map((step, index) => (
                    <div className="step-card" key={index}>
                        <div className="step-badge">{index + 1}</div>
                        <div className="step-icon-circle">
                            {step.icon}
                        </div>
                        <h3>{step.title}</h3>
                        <p>{step.desc}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
