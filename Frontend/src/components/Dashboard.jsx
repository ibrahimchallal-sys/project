import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, RefreshCw, Box, Search, Package, Video, FileText, FileSpreadsheet, Download, BarChart2 } from 'lucide-react';
import styled from 'styled-components';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

export default function Dashboard() {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [exportLoading, setExportLoading] = useState(null);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [activeSection, setActiveSection] = useState('containers');
  const chartRef = useRef(null);
  const navigate = useNavigate();

  const fetchContainers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:82/view-data', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.status === 401) {
        navigate('/login');
        return;
      }

      const data = await response.json();
      setContainers(data);
    } catch (err) {
      setError('Erreur de chargement des données.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyStats = async () => {
    try {
      const response = await fetch('http://localhost:82/stats/monthly', { credentials: 'include' });
      if (response.status === 401) { navigate('/login'); return; }
      const data = await response.json();
      setMonthlyStats(data);
    } catch (err) {
      console.error('Failed to load monthly stats', err);
    }
  };

  useEffect(() => {
    fetchContainers();
    fetchMonthlyStats();
  }, [navigate]);

  const handleDownloadChart = () => {
    const chart = chartRef.current;
    if (!chart) return;
    const url = chart.toBase64Image('image/png', 1);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statistiques_mensuel_${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  };

  // Build last 30 days labels and fill in counts
  const buildChartData = () => {
    const labels = [];
    const counts = [];
    const statsMap = {};
    monthlyStats.forEach(s => { statsMap[s._id] = s.count; });

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      labels.push(label);
      counts.push(statsMap[key] || 0);
    }
    return { labels, counts };
  };

  const { labels: chartLabels, counts: chartCounts } = buildChartData();

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Détections',
        data: chartCounts,
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: '#3b82f6',
        borderWidth: 2,
        borderRadius: 6,
        hoverBackgroundColor: 'rgba(59, 130, 246, 0.8)',
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#94a3b8',
        bodyColor: '#f8fafc',
        callbacks: {
          title: (items) => `Jour: ${items[0].label}`,
          label: (item) => `  ${item.raw} conteneur(s) détecté(s)`
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { size: 11 }, maxRotation: 45 },
        grid: { color: 'rgba(51, 65, 85, 0.5)' }
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#64748b', precision: 0 },
        grid: { color: 'rgba(51, 65, 85, 0.5)' }
      }
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:82/logout', { 
        method: 'POST',
        credentials: 'include'
      });
      navigate('/login');
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = async (format) => {
    setExportLoading(format);
    try {
      const response = await fetch(`http://localhost:82/generate-report?format=${format}`, {
        credentials: 'include'
      });
      if (response.status === 401) { navigate('/login'); return; }
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport_conteneurs_${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Erreur lors de la génération du rapport. Vérifiez que le serveur et Ollama sont démarrés.');
    } finally {
      setExportLoading(null);
    }
  };

  const filteredContainers = containers.filter(c => {
    const matchesSearch = c.container_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.shipping_company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.iso_code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCamera = selectedCamera ? String(c.camera_id || '1') === String(selectedCamera) : true;
    return matchesSearch && matchesCamera;
  });

  return (
    <DashboardContainer>
      <Sidebar>
        <LogoArea>
          <Box size={32} color="#1f93ff" />
          <h2>Marsa <span>Admin</span></h2>
        </LogoArea>
        <NavItems>
          <NavItem
            className={activeSection === 'containers' ? 'active' : ''}
            onClick={() => setActiveSection('containers')}
          >
            <Package size={20} />
            Conteneurs Scannés
          </NavItem>
          <NavItem
            className={activeSection === 'stats' ? 'active' : ''}
            onClick={() => setActiveSection('stats')}
          >
            <BarChart2 size={20} />
            Statistiques
          </NavItem>
          {activeSection === 'containers' && (
            <>
              <SidebarDivider>Exporter</SidebarDivider>
              <SidebarExportBtn onClick={() => handleExport('csv')} disabled={exportLoading !== null}>
                {exportLoading === 'csv' ? <RefreshCw size={16} className="spin" /> : <FileSpreadsheet size={16} />}
                Rapport CSV
              </SidebarExportBtn>
              <SidebarExportBtn onClick={() => handleExport('pdf')} disabled={exportLoading !== null} $pdf>
                {exportLoading === 'pdf' ? <RefreshCw size={16} className="spin" /> : <FileText size={16} />}
                Rapport PDF
              </SidebarExportBtn>
            </>
          )}
        </NavItems>
        <LogoutBtn onClick={handleLogout}>
          <LogOut size={20} />
          Déconnexion
        </LogoutBtn>
      </Sidebar>
      <MainContent>
        <Header>
          <h1>{activeSection === 'stats' ? 'Statistiques Mensuelles' : 'Tableau de Bord'}</h1>
          {activeSection === 'containers' && (
            <HeaderActions>
              <SearchBar>
                <Search size={18} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Rechercher par code, entreprise..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </SearchBar>
              <RefreshBtn onClick={fetchContainers} disabled={loading}>
                <RefreshCw size={20} className={loading ? 'spin' : ''} />
              </RefreshBtn>
            </HeaderActions>
          )}
        </Header>

        <ContentArea>
          {activeSection === 'stats' ? (
            <ChartSection>
              <ChartHeader>
                <ChartTitle>
                  <BarChart2 size={20} color="#3b82f6" />
                  Statistiques du Mois Écoulé
                </ChartTitle>
                <DownloadChartBtn onClick={handleDownloadChart}>
                  <Download size={16} />
                  Télécharger le graphique
                </DownloadChartBtn>
              </ChartHeader>
              <ChartWrapper>
                <Bar ref={chartRef} data={chartData} options={chartOptions} />
              </ChartWrapper>
            </ChartSection>
          ) : (
            <>
          <CamerasGrid>
            {[1, 2, 3, 4, 5, 6].map((camNum) => {
              const camDbId = String(camNum);
              const detectedCount = containers.filter(c => String(c.camera_id || '1') === camDbId).length;
              const isSelected = selectedCamera === camDbId;
              
              return (
                <CameraCard 
                  key={camNum} 
                  className={isSelected ? 'active' : ''} 
                  onClick={() => setSelectedCamera(isSelected ? null : camDbId)}
                >
                  <CardHeader>
                    <Video size={24} color={isSelected ? '#1f93ff' : '#64748b'} />
                    <h3>Caméra {camNum}</h3>
                  </CardHeader>
                  <CardBody>
                    <span className="count">{detectedCount}</span>
                    <span className="label">Détections</span>
                  </CardBody>
                </CameraCard>
              );
            })}
          </CamerasGrid>

          {error ? (
            <ErrorMessage>{error}</ErrorMessage>
          ) : (
            <TableContainer>
              <Table>
                <thead>
                  <tr>
                    <th>Caméra</th>
                    <th>Code Conteneur</th>
                    <th>Code ISO</th>
                    <th>Entreprise</th>
                    <th>Date d'ajout</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="5" className="text-center">Chargement...</td></tr>
                  ) : filteredContainers.length > 0 ? (
                    filteredContainers.map((container, index) => (
                      <tr key={index}>
                        <td>Caméra {container.camera_id || '1'}</td>
                        <td><strong>{container.container_code}</strong></td>
                        <td><Badge>{container.iso_code}</Badge></td>
                        <td>{container.shipping_company || 'Non spécifié'}</td>
                        <td>{new Date(container.created_at).toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="5" className="text-center">Aucun conteneur trouvé</td></tr>
                  )}
                </tbody>
              </Table>
            </TableContainer>
          )}
            </>
          )}
        </ContentArea>
      </MainContent>
    </DashboardContainer>
  );
}

const DashboardContainer = styled.div`
  display: flex;
  height: 100vh;
  background-color: #0f172a; /* Dark slate */
  color: #f8fafc;
  font-family: 'Inter', 'Roboto', sans-serif;
`;

const Sidebar = styled.aside`
  width: 280px;
  background-color: #1e293b; /* Slightly lighter slate */
  border-right: 1px solid #334155;
  display: flex;
  flex-direction: column;
  padding: 24px;
`;

const LogoArea = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 48px;

  h2 {
    font-size: 24px;
    font-weight: 700;
    margin: 0;
    color: #f1f5f9;
    
    span {
      color: #3b82f6; /* Bright blue for dark mode */
    }
  }
`;

const NavItems = styled.nav`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const NavItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  color: #94a3b8;
  transition: all 0.2s ease;

  &:hover {
    background-color: #334155;
    color: #f8fafc;
  }

  &.active {
    background-color: rgba(59, 130, 246, 0.15);
    color: #3b82f6;
  }
`;

const LogoutBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background-color: rgba(239, 68, 68, 0.1);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(239, 68, 68, 0.2);
  }
`;

const MainContent = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32px 48px;
  background-color: #1e293b;
  border-bottom: 1px solid #334155;

  h1 {
    font-size: 28px;
    font-weight: 700;
    margin: 0;
    color: #f8fafc;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const SidebarDivider = styled.span`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #475569;
  padding: 8px 16px 4px;
`;

const SidebarExportBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s ease;
  border: 1px solid ${({ $pdf }) => $pdf ? 'rgba(239, 68, 68, 0.25)' : 'rgba(34, 197, 94, 0.25)'};
  background: ${({ $pdf }) => $pdf ? 'rgba(239, 68, 68, 0.08)' : 'rgba(34, 197, 94, 0.08)'};
  color: ${({ $pdf }) => $pdf ? '#f87171' : '#4ade80'};
  width: 100%;

  &:hover:not(:disabled) {
    background: ${({ $pdf }) => $pdf ? 'rgba(239, 68, 68, 0.18)' : 'rgba(34, 197, 94, 0.18)'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    100% { transform: rotate(360deg); }
  }
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #0f172a;
  border: 1px solid #334155;
  padding: 10px 16px;
  border-radius: 50px;
  width: 300px;
  
  input {
    border: none;
    background: transparent;
    outline: none;
    width: 100%;
    color: #f8fafc;
    &::placeholder {
      color: #64748b;
    }
  }
`;

const ExportBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: ${({ $pdf }) => $pdf ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)'};
  color: ${({ $pdf }) => $pdf ? '#f87171' : '#4ade80'};
  border: 1px solid ${({ $pdf }) => $pdf ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'};
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: ${({ $pdf }) => $pdf ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spin {
    animation: spin 1s linear infinite;
  }
`;

const RefreshBtn = styled.button`
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 50%;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #94a3b8;
  transition: all 0.2s ease;

  &:hover {
    background-color: #0f172a;
    color: #3b82f6;
    border-color: #3b82f6;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    100% { transform: rotate(360deg); }
  }
`;

const ContentArea = styled.div`
  padding: 48px;
  overflow-y: auto;
  flex: 1;
`;

const TableContainer = styled.div`
  background-color: #1e293b;
  border-radius: 12px;
  border: 1px solid #334155;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.5), 0 2px 4px -2px rgb(0 0 0 / 0.5);
  overflow: hidden;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: 16px 24px;
    text-align: left;
    border-bottom: 1px solid #334155;
  }

  th {
    background-color: #0f172a;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    font-size: 13px;
    letter-spacing: 0.5px;
  }

  td {
    color: #cbd5e1;
    
    strong {
      color: #f8fafc;
      font-weight: 600;
    }

    &.text-center {
      text-align: center;
      color: #64748b;
      padding: 32px;
    }
  }

  tbody tr {
    transition: background-color 0.1s ease;
    &:hover {
      background-color: #0f172a;
    }
    &:last-child td {
      border-bottom: none;
    }
  }
`;

const Badge = styled.span`
  background-color: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.3);
  padding: 4px 10px;
  border-radius: 50px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
`;

const ErrorMessage = styled.div`
  background-color: #fee2e2;
  color: #ef4444;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
  font-weight: 500;
`;

const ChartSection = styled.div`
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 32px;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.3);
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const ChartTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #e2e8f0;
`;

const ChartWrapper = styled.div`
  height: 260px;
`;

const DownloadChartBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(59, 130, 246, 0.1);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(59, 130, 246, 0.2);
  }
`;

const CamerasGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-bottom: 32px;

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (min-width: 1400px) {
    grid-template-columns: repeat(6, 1fr);
  }
`;

const CameraCard = styled.div`
  background: #1e293b;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.3);
  border: 1px solid #334155;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.4);
    border-color: #475569;
  }

  &.active {
    border-color: #3b82f6;
    background-color: rgba(59, 130, 246, 0.1);
    box-shadow: 0 0 0 1px #3b82f6;

    h3 {
      color: #60a5fa;
    }
    
    .count {
      color: #60a5fa;
    }
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;

  h3 {
    margin: 0;
    font-size: 16px;
    color: #e2e8f0;
    font-weight: 600;
    transition: color 0.2s;
  }
`;

const CardBody = styled.div`
  display: flex;
  flex-direction: column;
  
  .count {
    font-size: 28px;
    font-weight: 700;
    color: #f8fafc;
    transition: color 0.2s;
  }
  
  .label {
    font-size: 13px;
    color: #64748b;
    font-weight: 500;
  }
`;
