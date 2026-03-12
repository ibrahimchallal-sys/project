import React, { useState, useEffect } from 'react';
import Logo from '../assets/logo2.png';
import '../css/Navbar.css'
import { useNavigate, useLocation } from 'react-router-dom';
import { Scan, User, Bell, Package, X } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [lastSeenCount, setLastSeenCount] = useState(() => {
    const saved = localStorage.getItem('marsa_last_seen_alerts');
    return saved ? parseInt(saved, 10) : 0;
  });

  const fetchAlertCount = async () => {
    try {
      const response = await fetch('http://localhost:82/alerts/count', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setAlertCount(data.count);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRecentAlerts = async () => {
    try {
      const response = await fetch('http://localhost:82/alerts/recent', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setRecentAlerts(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleNotifications = () => {
    if (!showNotifications) {
      fetchRecentAlerts();
      setLastSeenCount(alertCount);
      localStorage.setItem('marsa_last_seen_alerts', alertCount.toString());
    }
    setShowNotifications(!showNotifications);
  };

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch('http://localhost:82/auth/status', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
        const data = await response.json();
        setIsLoggedIn(data.authenticated);
        if (data.authenticated) {
          fetchAlertCount();
        }
      } catch (err) {
        setIsLoggedIn(false);
      }
    };
    
    checkAuthStatus();
    
    // Setup polling for notifications if logged in
    let interval;
    if (isLoggedIn) {
      interval = setInterval(fetchAlertCount, 10000); // 10 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    }
  }, [location.pathname, isLoggedIn]);
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

        {isLoggedIn ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={toggleNotifications}>
              <Bell size={24} color="#1f93ff" />
              {alertCount - lastSeenCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  borderRadius: '50%',
                  padding: '2px 6px',
                  minWidth: '18px',
                  textAlign: 'center'
                }}>
                  {alertCount - lastSeenCount}
                </span>
              )}
            </div>

            {showNotifications && (
              <div style={{
                position: 'absolute',
                top: '50px',
                right: '50px',
                width: '320px',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                border: '1px solid #e2e8f0',
                zIndex: 1000,
                overflow: 'hidden',
                color: '#0f172a'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '16px',
                  borderBottom: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc'
                }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>Notifications ({alertCount})</h3>
                  <X size={18} color="#64748b" style={{ cursor: 'pointer' }} onClick={() => setShowNotifications(false)} />
                </div>
                
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {recentAlerts.length > 0 ? (
                    recentAlerts.map((alert, idx) => (
                      <div key={idx} style={{
                        padding: '16px',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        gap: '12px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      onClick={() => {
                        setShowNotifications(false);
                        navigate('/dashboard');
                      }}>
                        <div style={{
                          backgroundColor: '#eff6ff',
                          padding: '8px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: 'fit-content'
                        }}>
                          <Package size={18} color="#1f93ff" />
                        </div>
                        <div>
                          <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#334155' }}>
                            <strong>Caméra {alert.camera_id || '1'}</strong> a détecté <strong>{alert.container_code}</strong>
                          </p>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {new Date(alert.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                      Aucune notification
                    </div>
                  )}
                </div>
                <div 
                  style={{ 
                    padding: '12px', 
                    textAlign: 'center', 
                    backgroundColor: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#1f93ff'
                  }}
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/dashboard');
                  }}
                >
                  Voir tout dans le Dashboard
                </div>
              </div>
            )}
            
            <button 
              className="profile-button" 
              onClick={() => navigate('/dashboard')}
              style={{
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: 'transparent',
                border: '2px solid #1f93ff', 
                borderRadius: '50%', 
                padding: '8px', 
                cursor: 'pointer',
                color: '#1f93ff',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#1f93ff';
                e.currentTarget.style.color = 'white';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#1f93ff';
              }}
            >
              <User size={24} />
            </button>
          </div>
        ) : (
          <button className="get-started-button" onClick={() => navigate('/login')}>Login</button>
        )}
      </div>
    </nav>
  );
}
