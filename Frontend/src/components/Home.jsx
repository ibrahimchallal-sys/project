import React, { useEffect } from 'react';
import HeroBackground from './HeroBackground';
import Workflow from './Workflow';

export default function Home() {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <main style={{ backgroundColor: '#001a35', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <HeroBackground />
            <Workflow />
        </main>
    );
}
