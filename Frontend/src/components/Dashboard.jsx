import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, RefreshCw, Box, Search, Package, Video, FileText, FileSpreadsheet, Download, BarChart2, Users, Plus, Trash2, Camera, X, CheckSquare, Square, Crown, Pencil, UserPlus, Activity, Layers, TrendingUp, AlertTriangle, Clock, Smartphone } from 'lucide-react';
import styled, { keyframes } from 'styled-components';
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
  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamLeader, setNewTeamLeader] = useState('');
  const [newLeaderPhone, setNewLeaderPhone] = useState('');
  const [createTeamError, setCreateTeamError] = useState('');
  const [assigningTeam, setAssigningTeam] = useState(null);
  const [selectedCameras, setSelectedCameras] = useState([]);
  const [camerasList, setCamerasList] = useState([]);
  const [showManageCameras, setShowManageCameras] = useState(false);
  const [newCameraName, setNewCameraName] = useState('');
  const [newCameraIp, setNewCameraIp] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [newTeamMembers, setNewTeamMembers] = useState([]);
  const [newMemberInput, setNewMemberInput] = useState('');
  const [editingContainer, setEditingContainer] = useState(null);
  const [editContainerData, setEditContainerData] = useState({});
  const [managingMembersTeam, setManagingMembersTeam] = useState(null);
  const [addMemberInput, setAddMemberInput] = useState('');
  const [stops, setStops] = useState([]);
  const [stopsLoading, setStopsLoading] = useState(false);
  const [showCreateStop, setShowCreateStop] = useState(false);
  const [stopForm, setStopForm] = useState({ reason: '', team_id: '', team_name: '', start_time: '', confirmation_time: '', status: 'active' });
  const [stopFormError, setStopFormError] = useState('');
  const [editingStop, setEditingStop] = useState(null);
  const [whatsappStatus, setWhatsappStatus] = useState('disconnected');
  const [whatsappQr, setWhatsappQr] = useState(null);
  const chartRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (activeSection !== 'whatsapp') return;
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetch('http://localhost:3001/api/whatsapp/status');
        if (!r.ok) return;
        const d = await r.json();
        if (!cancelled) { setWhatsappStatus(d.status); setWhatsappQr(d.qr || null); }
      } catch {}
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(id); };
  }, [activeSection]);

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

  const fetchTeams = async () => {
    setTeamsLoading(true);
    try {
      const res = await fetch('http://localhost:82/teams', { credentials: 'include' });
      if (res.status === 401) { navigate('/login'); return; }
      const data = await res.json();
      setTeams(data);
    } catch (err) {
      console.error('Failed to load teams', err);
    } finally {
      setTeamsLoading(false);
    }
  };

  const fetchCameras = async () => {
    try {
      const res = await fetch('http://localhost:82/cameras', { credentials: 'include' });
      if (res.ok) setCamerasList(await res.json());
    } catch (err) {
      console.error('Failed to load cameras', err);
    }
  };

  const fetchStops = async () => {
    setStopsLoading(true);
    try {
      const res = await fetch('http://localhost:82/stops', { credentials: 'include' });
      if (res.status === 401) { navigate('/login'); return; }
      if (res.ok) setStops(await res.json());
    } catch (err) {
      console.error('Failed to load stops', err);
    } finally {
      setStopsLoading(false);
    }
  };

  const handleCreateStop = async () => {
    setStopFormError('');
    if (!stopForm.reason.trim() || !stopForm.start_time) {
      setStopFormError('La raison et la date de début sont requises.');
      return;
    }
    try {
      const team = teams.find(t => t._id === stopForm.team_id);
      const body = {
        reason: stopForm.reason.trim(),
        team_id: stopForm.team_id || null,
        team_name: team ? team.name : stopForm.team_name,
        start_time: stopForm.start_time,
        confirmation_time: stopForm.confirmation_time || null,
        status: stopForm.status
      };
      const res = await fetch('http://localhost:82/stops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      if (!res.ok) { const d = await res.json(); setStopFormError(d.error || 'Erreur.'); return; }
      setShowCreateStop(false);
      setStopForm({ reason: '', team_id: '', team_name: '', start_time: '', confirmation_time: '', status: 'active' });
      fetchStops();
    } catch (err) { setStopFormError('Erreur serveur.'); }
  };

  const handleUpdateStop = async () => {
    setStopFormError('');
    if (!editingStop.reason.trim() || !editingStop.start_time) {
      setStopFormError('La raison et la date de début sont requises.');
      return;
    }
    try {
      const team = teams.find(t => t._id === editingStop.team_id);
      const body = {
        reason: editingStop.reason,
        team_id: editingStop.team_id || null,
        team_name: team ? team.name : editingStop.team_name,
        start_time: editingStop.start_time,
        confirmation_time: editingStop.confirmation_time || null,
        status: editingStop.status
      };
      await fetch(`http://localhost:82/stops/${editingStop._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      setEditingStop(null);
      fetchStops();
    } catch (err) { console.error(err); }
  };

  const handleDeleteStop = async (id) => {
    if (!window.confirm('Supprimer cet arrêt ?')) return;
    try {
      await fetch(`http://localhost:82/stops/${id}`, { method: 'DELETE', credentials: 'include' });
      fetchStops();
    } catch (err) { console.error(err); }
  };

  const computeDelay = (start, end) => {
    if (!start) return '—';
    const from = new Date(start);
    const to = end ? new Date(end) : new Date();
    const diffMs = to - from;
    if (diffMs < 0) return '—';
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes} min`;
  };

  const handleAddCamera = async () => {
    setCameraError('');
    if (!newCameraName.trim()) { setCameraError('Le nom de la caméra est requis.'); return; }
    try {
      const res = await fetch('http://localhost:82/cameras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newCameraName.trim(), ip_address: newCameraIp.trim() })
      });
      if (!res.ok) { const d = await res.json(); setCameraError(d.error || 'Erreur lors de l\'ajout.'); return; }
      setNewCameraName('');
      setNewCameraIp('');
      fetchCameras();
    } catch (err) { console.error(err); setCameraError('Erreur réseau.'); }
  };

  const handleDeleteCamera = async (id) => {
    try {
      await fetch(`http://localhost:82/cameras/${id}`, { method: 'DELETE', credentials: 'include' });
      fetchCameras();
      fetchTeams();
    } catch (err) { console.error(err); }
  };

  const addMember = () => {
    if (!newMemberInput.trim()) return;
    setNewTeamMembers(prev => [...prev, newMemberInput.trim()]);
    setNewMemberInput('');
  };

  const removeMember = (idx) => {
    setNewTeamMembers(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCreateTeam = async () => {
    setCreateTeamError('');
    if (!newTeamName.trim() || !newTeamLeader.trim() || !newLeaderPhone.trim()) {
      setCreateTeamError('Veuillez remplir tous les champs.');
      return;
    }
    try {
      const res = await fetch('http://localhost:82/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newTeamName.trim(), leader_name: newTeamLeader.trim(), leader_phone: newLeaderPhone.trim(), members: newTeamMembers })
      });
      const data = await res.json();
      if (!res.ok) { setCreateTeamError(data.error); return; }
      setShowCreateTeam(false);
      setNewTeamName('');
      setNewTeamLeader('');
      setNewLeaderPhone('');
      setNewTeamMembers([]);
      setNewMemberInput('');
      fetchTeams();
    } catch (err) {
      setCreateTeamError('Erreur serveur.');
    }
  };

  const handleDeleteTeam = async (id) => {
    if (!window.confirm('Supprimer cette équipe ?')) return;
    try {
      await fetch(`http://localhost:82/teams/${id}`, { method: 'DELETE', credentials: 'include' });
      fetchTeams();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteContainer = async (id) => {
    if (!window.confirm('Supprimer ce conteneur ?')) return;
    try {
      await fetch(`http://localhost:82/scans/${id}`, { method: 'DELETE', credentials: 'include' });
      fetchContainers();
    } catch (err) { console.error(err); }
  };

  const handleUpdateContainer = async () => {
    try {
      await fetch(`http://localhost:82/scans/${editingContainer._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editContainerData)
      });
      setEditingContainer(null);
      fetchContainers();
    } catch (err) { console.error(err); }
  };

  const handleAddMemberToTeam = async () => {
    if (!addMemberInput.trim()) return;
    try {
      await fetch(`http://localhost:82/teams/${managingMembersTeam._id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ member: addMemberInput.trim() })
      });
      setAddMemberInput('');
      fetchTeams();
    } catch (err) { console.error(err); }
  };

  const handleRemoveMemberFromTeam = async (member) => {
    try {
      await fetch(`http://localhost:82/teams/${managingMembersTeam._id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ member })
      });
      fetchTeams();
      setManagingMembersTeam(prev => prev ? { ...prev, members: (prev.members || []).filter(m => m !== member) } : null);
    } catch (err) { console.error(err); }
  };

  const openAssignCameras = (team) => {
    setAssigningTeam(team);
    setSelectedCameras(team.camera_ids || []);
  };

  const handleSaveCameras = async () => {
    try {
      await fetch(`http://localhost:82/teams/${assigningTeam._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ camera_ids: selectedCameras })
      });
      setAssigningTeam(null);
      fetchTeams();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleCamera = (camId) => {
    setSelectedCameras(prev =>
      prev.includes(camId) ? prev.filter(c => c !== camId) : [...prev, camId]
    );
  };

  useEffect(() => {
    fetchContainers();
    fetchMonthlyStats();
    fetchCameras();
    fetchTeams();
    fetchStops();
  }, [navigate]);

  useEffect(() => {
    if (activeSection === 'teams') { fetchTeams(); fetchCameras(); }
    if (activeSection === 'stops') { fetchStops(); fetchTeams(); }
  }, [activeSection]);

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

  // Computed stats for KPI cards
  const totalThisMonth = monthlyStats.reduce((sum, s) => sum + s.count, 0);
  const totalDetections = chartCounts.reduce((a, b) => a + b, 0);
  const peakDetections = chartCounts.length ? Math.max(...chartCounts) : 0;
  const avgDetections = totalDetections > 0 ? (totalDetections / 30).toFixed(1) : '0';

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
          <LogoIcon>
            <Box size={20} color="#3b82f6" />
          </LogoIcon>
          <LogoText>
            <h2>Marsa <span>Admin</span></h2>
            <p>Système de Détection</p>
          </LogoText>
        </LogoArea>

        <NavSectionLabel>Navigation</NavSectionLabel>
        <NavItems>
          <NavItem
            className={activeSection === 'containers' ? 'active' : ''}
            onClick={() => setActiveSection('containers')}
          >
            <Package size={18} />
            Conteneurs Scannés
            {containers.length > 0 && activeSection !== 'containers' && (
              <NavBadge>{containers.length}</NavBadge>
            )}
          </NavItem>
          <NavItem
            className={activeSection === 'stats' ? 'active' : ''}
            onClick={() => setActiveSection('stats')}
          >
            <BarChart2 size={18} />
            Statistiques
          </NavItem>
          <NavItem
            className={activeSection === 'teams' ? 'active' : ''}
            onClick={() => setActiveSection('teams')}
          >
            <Users size={18} />
            Équipes
            {teams.length > 0 && activeSection !== 'teams' && (
              <NavBadge>{teams.length}</NavBadge>
            )}
          </NavItem>
          <NavItem
            className={activeSection === 'stops' ? 'active' : ''}
            onClick={() => setActiveSection('stops')}
          >
            <AlertTriangle size={18} />
            Arrêts
            {stops.filter(s => s.status === 'active').length > 0 && activeSection !== 'stops' && (
              <NavBadge $danger>{stops.filter(s => s.status === 'active').length}</NavBadge>
            )}
          </NavItem>
          <NavItem
            className={activeSection === 'whatsapp' ? 'active' : ''}
            onClick={() => setActiveSection('whatsapp')}
          >
            <Smartphone size={18} />
            WhatsApp
            {whatsappStatus === 'qr' && activeSection !== 'whatsapp' && (
              <NavBadge $danger>!</NavBadge>
            )}
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

        <SidebarFooter>
          <LogoutBtn onClick={handleLogout}>
            <LogOut size={18} />
            Déconnexion
          </LogoutBtn>
        </SidebarFooter>
      </Sidebar>

      <MainContent>
        <Header>
          <HeaderLeft>
            <h1>
              {activeSection === 'stats' ? 'Statistiques Mensuelles'
                : activeSection === 'teams' ? 'Gestion des Équipes'
                : activeSection === 'stops' ? 'Arrêts de Travail'
                : activeSection === 'whatsapp' ? 'WhatsApp'
                : 'Tableau de Bord'}
            </h1>
            <HeaderSubtitle>
              {activeSection === 'stats' ? 'Visualisation des détections sur 30 jours'
                : activeSection === 'teams' ? `${teams.length} équipe(s) · ${camerasList.length} caméra(s)`
                : activeSection === 'stops' ? `${stops.length} arrêt(s) · ${stops.filter(s => s.status === 'active').length} en cours`
                : activeSection === 'whatsapp' ? 'Connexion WhatsApp Web'
                : `${filteredContainers.length} conteneur(s) trouvé(s)`}
            </HeaderSubtitle>
          </HeaderLeft>
          <HeaderRight>
            {activeSection === 'teams' && (
              <AddTeamBtn onClick={() => { setShowCreateTeam(true); setCreateTeamError(''); }}>
                <Plus size={16} />
                Nouvelle Équipe
              </AddTeamBtn>
            )}
            {activeSection === 'stops' && (
              <AddTeamBtn $warning onClick={() => { setShowCreateStop(true); setStopFormError(''); setStopForm({ reason: '', team_id: '', team_name: '', start_time: new Date().toISOString().slice(0, 16), confirmation_time: '', status: 'active' }); }}>
                <Plus size={16} />
                Nouvel Arrêt
              </AddTeamBtn>
            )}
            {activeSection === 'containers' && (
              <HeaderActions>
                <SearchBar>
                  <Search size={16} color="#64748b" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </SearchBar>
                <RefreshBtn onClick={fetchContainers} disabled={loading} title="Actualiser">
                  <RefreshCw size={16} className={loading ? 'spin' : ''} />
                </RefreshBtn>
              </HeaderActions>
            )}
          </HeaderRight>
        </Header>

        <ContentArea key={activeSection}>
          {activeSection === 'teams' ? (
            <>
              <TeamsToolbar>
                <ManageCamerasBtn onClick={() => { setShowManageCameras(true); fetchCameras(); setCameraError(''); }}>
                  <Camera size={16} />
                  Gérer les caméras ({camerasList.length})
                </ManageCamerasBtn>
                <AddTeamBtn onClick={() => { setShowCreateTeam(true); setCreateTeamError(''); setNewTeamMembers([]); setNewMemberInput(''); }}>
                  <Plus size={16} />
                  Nouvelle Équipe
                </AddTeamBtn>
              </TeamsToolbar>

              {teamsLoading ? (
                <EmptyTeams>
                  <RefreshCw size={32} className="spin" color="#334155" />
                  <p>Chargement des équipes...</p>
                </EmptyTeams>
              ) : teams.length === 0 ? (
                <EmptyTeams>
                  <EmptyIcon><Users size={40} /></EmptyIcon>
                  <EmptyTitle>Aucune équipe créée</EmptyTitle>
                  <p>Cliquez sur <strong>Nouvelle Équipe</strong> pour commencer.</p>
                </EmptyTeams>
              ) : (
                <TeamsGrid>
                  {teams.map(team => (
                    <TeamCard key={team._id}>
                      <TeamCardHeader>
                        <TeamName>{team.name}</TeamName>
                        <TeamActions>
                          <TeamIconBtn title="Gérer les membres" onClick={() => { setManagingMembersTeam(team); setAddMemberInput(''); }}>
                            <UserPlus size={15} />
                          </TeamIconBtn>
                          <TeamIconBtn title="Affecter des caméras" onClick={() => openAssignCameras(team)}>
                            <Camera size={15} />
                          </TeamIconBtn>
                          <TeamIconBtn $danger title="Supprimer" onClick={() => handleDeleteTeam(team._id)}>
                            <Trash2 size={15} />
                          </TeamIconBtn>
                        </TeamActions>
                      </TeamCardHeader>
                      <LeaderRow>
                        <Crown size={13} color="#f59e0b" />
                        <span>{team.leader_name}</span>
                      </LeaderRow>
                      {(team.members || []).length > 0 && (
                        <MembersSection>
                          <MembersLabel>Membres ({team.members.length})</MembersLabel>
                          <MembersList>
                            {team.members.map((m, i) => (
                              <MemberTag key={i}>{m}</MemberTag>
                            ))}
                          </MembersList>
                        </MembersSection>
                      )}
                      <CameraBadgesRow>
                        {(team.camera_ids || []).length === 0 ? (
                          <NoCameras>Aucune caméra affectée</NoCameras>
                        ) : (
                          (team.camera_ids).map(cid => {
                            const cam = camerasList.find(c => String(c._id) === String(cid));
                            return (
                              <CamBadge key={cid}><Camera size={10} /> {cam ? cam.name : cid}</CamBadge>
                            );
                          })
                        )}
                      </CameraBadgesRow>
                    </TeamCard>
                  ))}
                </TeamsGrid>
              )}

              {/* Create Team Modal */}
              {showCreateTeam && (
                <ModalOverlay onClick={() => setShowCreateTeam(false)}>
                  <ModalBox onClick={e => e.stopPropagation()}>
                    <ModalHeader>
                      <h3>Nouvelle Équipe</h3>
                      <ModalCloseBtn onClick={() => setShowCreateTeam(false)}><X size={18} /></ModalCloseBtn>
                    </ModalHeader>
                    <ModalBody>
                      <ModalField>
                        <label>Nom de l'équipe</label>
                        <input
                          type="text"
                          placeholder="Ex: Équipe Alpha"
                          value={newTeamName}
                          onChange={e => setNewTeamName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleCreateTeam()}
                          autoFocus
                        />
                      </ModalField>
                      <ModalField>
                        <label>Chef d'équipe</label>
                        <input
                          type="text"
                          placeholder="Nom complet du chef"
                          value={newTeamLeader}
                          onChange={e => setNewTeamLeader(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleCreateTeam()}
                        />
                      </ModalField>
                      <ModalField>
                        <label>Numéro WhatsApp du chef</label>
                        <input
                          type="tel"
                          placeholder="Ex: 0612345678"
                          value={newLeaderPhone}
                          onChange={e => setNewLeaderPhone(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleCreateTeam()}
                        />
                      </ModalField>
                      <ModalField>
                        <label>Membres</label>
                        <MemberInputRow>
                          <input
                            type="text"
                            placeholder="Nom du membre"
                            value={newMemberInput}
                            onChange={e => setNewMemberInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addMember())}
                          />
                          <AddMemberBtn type="button" onClick={addMember}><Plus size={15} /></AddMemberBtn>
                        </MemberInputRow>
                        {newTeamMembers.length > 0 && (
                          <MembersTagList>
                            {newTeamMembers.map((m, i) => (
                              <MemberTagEdit key={i}>
                                {m}
                                <button onClick={() => removeMember(i)}><X size={11} /></button>
                              </MemberTagEdit>
                            ))}
                          </MembersTagList>
                        )}
                      </ModalField>
                      {createTeamError && <ModalError>{createTeamError}</ModalError>}
                    </ModalBody>
                    <ModalFooter>
                      <ModalCancelBtn onClick={() => setShowCreateTeam(false)}>Annuler</ModalCancelBtn>
                      <ModalConfirmBtn onClick={handleCreateTeam}>Créer l'équipe</ModalConfirmBtn>
                    </ModalFooter>
                  </ModalBox>
                </ModalOverlay>
              )}

              {/* Manage Cameras Modal */}
              {showManageCameras && (
                <ModalOverlay onClick={() => setShowManageCameras(false)}>
                  <ModalBox onClick={e => e.stopPropagation()}>
                    <ModalHeader>
                      <h3>Gérer les caméras</h3>
                      <ModalCloseBtn onClick={() => setShowManageCameras(false)}><X size={18} /></ModalCloseBtn>
                    </ModalHeader>
                    <ModalBody>
                      <CameraAddForm>
                        <input
                          type="text"
                          placeholder="Nom (ex: Caméra Entrée Nord)"
                          value={newCameraName}
                          onChange={e => { setNewCameraName(e.target.value); setCameraError(''); }}
                          autoFocus
                        />
                        <input
                          type="text"
                          placeholder="Adresse IP (ex: 192.168.1.10)"
                          value={newCameraIp}
                          onChange={e => setNewCameraIp(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddCamera()}
                        />
                        <AddMemberBtn type="button" onClick={handleAddCamera}><Plus size={15} /></AddMemberBtn>
                      </CameraAddForm>
                      {cameraError && <ModalError>{cameraError}</ModalError>}
                      <CameraManageList>
                        {camerasList.length === 0 ? (
                          <NoCameras>Aucune caméra ajoutée.</NoCameras>
                        ) : camerasList.map(cam => (
                          <CameraManageItem key={cam._id}>
                            <Camera size={14} color="#60a5fa" />
                            <span>{cam.name}</span>
                            {cam.ip_address && <CameraCodeBadge>{cam.ip_address}</CameraCodeBadge>}
                            <TeamIconBtn $danger onClick={() => handleDeleteCamera(String(cam._id))}>
                              <Trash2 size={13} />
                            </TeamIconBtn>
                          </CameraManageItem>
                        ))}
                      </CameraManageList>
                    </ModalBody>
                    <ModalFooter>
                      <ModalConfirmBtn onClick={() => setShowManageCameras(false)}>Fermer</ModalConfirmBtn>
                    </ModalFooter>
                  </ModalBox>
                </ModalOverlay>
              )}

              {/* Assign Cameras Modal */}
              {assigningTeam && (
                <ModalOverlay onClick={() => setAssigningTeam(null)}>
                  <ModalBox onClick={e => e.stopPropagation()}>
                    <ModalHeader>
                      <h3>Affecter des caméras — {assigningTeam.name}</h3>
                      <ModalCloseBtn onClick={() => setAssigningTeam(null)}><X size={18} /></ModalCloseBtn>
                    </ModalHeader>
                    <ModalBody>
                      {camerasList.length === 0 ? (
                        <NoCameras style={{ padding: '16px 0' }}>
                          Aucune caméra disponible. Ajoutez des caméras d'abord via "Gérer les caméras".
                        </NoCameras>
                      ) : (
                        <CameraCheckGrid>
                          {camerasList.map(cam => {
                            const cid = String(cam._id);
                            const checked = selectedCameras.includes(cid);
                            const ownedByOther = teams.find(
                              t => String(t._id) !== String(assigningTeam._id) && (t.camera_ids || []).includes(cid)
                            );
                            return (
                              <CameraCheckItem
                                key={cid}
                                $checked={checked}
                                $disabled={!!ownedByOther && !checked}
                                onClick={() => !ownedByOther && toggleCamera(cid)}
                                title={ownedByOther ? `Utilisée par : ${ownedByOther.name}` : ''}
                              >
                                {checked ? <CheckSquare size={16} color="#3b82f6" /> : <Square size={16} color="#64748b" />}
                                <span>{cam.name}</span>
                                {ownedByOther && <OwnedTag>{ownedByOther.name}</OwnedTag>}
                              </CameraCheckItem>
                            );
                          })}
                        </CameraCheckGrid>
                      )}
                    </ModalBody>
                    <ModalFooter>
                      <ModalCancelBtn onClick={() => setAssigningTeam(null)}>Annuler</ModalCancelBtn>
                      <ModalConfirmBtn onClick={handleSaveCameras}>Enregistrer</ModalConfirmBtn>
                    </ModalFooter>
                  </ModalBox>
                </ModalOverlay>
              )}
            </>
          ) : activeSection === 'stops' ? (
            <>
              {stopsLoading ? (
                <EmptyTeams>
                  <RefreshCw size={32} className="spin" color="#334155" />
                  <p>Chargement des arrêts...</p>
                </EmptyTeams>
              ) : (
                <TableContainer>
                  <TableHeader>
                    <TableTitle>
                      <AlertTriangle size={15} color="#f59e0b" />
                      Liste des arrêts
                    </TableTitle>
                    <ResultCount>{stops.length} arrêt(s)</ResultCount>
                  </TableHeader>
                  <Table>
                    <thead>
                      <tr>
                        <th>Équipe arrêtée</th>
                        <th>Raison du stop</th>
                        <th>Heure de début</th>
                        <th>Délai</th>
                        <th>Heure de confirmation</th>
                        <th>Statut</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {stops.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center">
                            <EmptyTableState>
                              <EmptyIcon><AlertTriangle size={32} /></EmptyIcon>
                              <EmptyTitle>Aucun arrêt enregistré</EmptyTitle>
                              <p>Cliquez sur <strong>Nouvel Arrêt</strong> pour en ajouter un.</p>
                            </EmptyTableState>
                          </td>
                        </tr>
                      ) : stops.map((stop, idx) => (
                        <tr key={idx}>
                          <td>
                            {stop.team_name ? (
                              <StopTeamCell>
                                <Users size={13} color="#60a5fa" />
                                {stop.team_name}
                              </StopTeamCell>
                            ) : <span style={{ color: '#475569', fontStyle: 'italic' }}>Non assignée</span>}
                          </td>
                          <td><strong>{stop.reason}</strong></td>
                          <td style={{ color: '#94a3b8', fontSize: '13px' }}>
                            {stop.start_time ? new Date(stop.start_time).toLocaleString('fr-FR') : '—'}
                          </td>
                          <td>
                            <DelayBadge $active={stop.status === 'active'}>
                              <Clock size={12} />
                              {computeDelay(stop.start_time, stop.confirmation_time || (stop.status === 'resolved' ? stop.updated_at : null))}
                            </DelayBadge>
                          </td>
                          <td style={{ color: '#94a3b8', fontSize: '13px' }}>
                            {stop.confirmation_time ? new Date(stop.confirmation_time).toLocaleString('fr-FR') : <span style={{ color: '#475569', fontStyle: 'italic' }}>Non confirmée</span>}
                          </td>
                          <td>
                            {stop.status === 'active' ? (
                              <StopStatusBadge $active>En cours</StopStatusBadge>
                            ) : (
                              <StopStatusBadge>Résolu</StopStatusBadge>
                            )}
                          </td>
                          <td>
                            <RowActions>
                              <TeamIconBtn title="Modifier" onClick={() => { setEditingStop({ ...stop, start_time: stop.start_time ? new Date(stop.start_time).toISOString().slice(0, 16) : '', confirmation_time: stop.confirmation_time ? new Date(stop.confirmation_time).toISOString().slice(0, 16) : '' }); setStopFormError(''); }}>
                                <Pencil size={13} />
                              </TeamIconBtn>
                              <TeamIconBtn $danger title="Supprimer" onClick={() => handleDeleteStop(stop._id)}>
                                <Trash2 size={13} />
                              </TeamIconBtn>
                            </RowActions>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </TableContainer>
              )}

              {/* Create Stop Modal */}
              {showCreateStop && (
                <ModalOverlay onClick={() => setShowCreateStop(false)}>
                  <ModalBox onClick={e => e.stopPropagation()}>
                    <ModalHeader>
                      <h3>Nouvel Arrêt</h3>
                      <ModalCloseBtn onClick={() => setShowCreateStop(false)}><X size={18} /></ModalCloseBtn>
                    </ModalHeader>
                    <ModalBody>
                      <ModalField>
                        <label>Raison du stop</label>
                        <input type="text" placeholder="Ex: Panne de grue" autoFocus value={stopForm.reason} onChange={e => setStopForm(p => ({ ...p, reason: e.target.value }))} />
                      </ModalField>
                      <ModalField>
                        <label>Équipe arrêtée</label>
                        <select value={stopForm.team_id} onChange={e => setStopForm(p => ({ ...p, team_id: e.target.value }))}>
                          <option value="">— Aucune équipe —</option>
                          {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                        </select>
                      </ModalField>
                      <ModalField>
                        <label>Heure de début</label>
                        <input type="datetime-local" value={stopForm.start_time} onChange={e => setStopForm(p => ({ ...p, start_time: e.target.value }))} />
                      </ModalField>
                      <ModalField>
                        <label>Heure de confirmation de la raison</label>
                        <input type="datetime-local" value={stopForm.confirmation_time} onChange={e => setStopForm(p => ({ ...p, confirmation_time: e.target.value }))} />
                      </ModalField>
                      <ModalField>
                        <label>Statut</label>
                        <select value={stopForm.status} onChange={e => setStopForm(p => ({ ...p, status: e.target.value }))}>
                          <option value="active">En cours</option>
                          <option value="resolved">Résolu</option>
                        </select>
                      </ModalField>
                      {stopFormError && <ModalError>{stopFormError}</ModalError>}
                    </ModalBody>
                    <ModalFooter>
                      <ModalCancelBtn onClick={() => setShowCreateStop(false)}>Annuler</ModalCancelBtn>
                      <ModalConfirmBtn onClick={handleCreateStop}>Enregistrer</ModalConfirmBtn>
                    </ModalFooter>
                  </ModalBox>
                </ModalOverlay>
              )}

              {/* Edit Stop Modal */}
              {editingStop && (
                <ModalOverlay onClick={() => setEditingStop(null)}>
                  <ModalBox onClick={e => e.stopPropagation()}>
                    <ModalHeader>
                      <h3>Modifier l'arrêt</h3>
                      <ModalCloseBtn onClick={() => setEditingStop(null)}><X size={18} /></ModalCloseBtn>
                    </ModalHeader>
                    <ModalBody>
                      <ModalField>
                        <label>Raison du stop</label>
                        <input type="text" value={editingStop.reason} onChange={e => setEditingStop(p => ({ ...p, reason: e.target.value }))} />
                      </ModalField>
                      <ModalField>
                        <label>Équipe arrêtée</label>
                        <select value={editingStop.team_id || ''} onChange={e => setEditingStop(p => ({ ...p, team_id: e.target.value }))}>
                          <option value="">— Aucune équipe —</option>
                          {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                        </select>
                      </ModalField>
                      <ModalField>
                        <label>Heure de début</label>
                        <input type="datetime-local" value={editingStop.start_time} onChange={e => setEditingStop(p => ({ ...p, start_time: e.target.value }))} />
                      </ModalField>
                      <ModalField>
                        <label>Heure de confirmation de la raison</label>
                        <input type="datetime-local" value={editingStop.confirmation_time || ''} onChange={e => setEditingStop(p => ({ ...p, confirmation_time: e.target.value }))} />
                      </ModalField>
                      <ModalField>
                        <label>Statut</label>
                        <select value={editingStop.status} onChange={e => setEditingStop(p => ({ ...p, status: e.target.value }))}>
                          <option value="active">En cours</option>
                          <option value="resolved">Résolu</option>
                        </select>
                      </ModalField>
                      {stopFormError && <ModalError>{stopFormError}</ModalError>}
                    </ModalBody>
                    <ModalFooter>
                      <ModalCancelBtn onClick={() => setEditingStop(null)}>Annuler</ModalCancelBtn>
                      <ModalConfirmBtn onClick={handleUpdateStop}>Enregistrer</ModalConfirmBtn>
                    </ModalFooter>
                  </ModalBox>
                </ModalOverlay>
              )}
            </>
          ) : activeSection === 'whatsapp' ? (
            <WaSection>
              {whatsappStatus === 'ready' ? (
                <WaConnected>
                  <WaConnectedDot />
                  <span>WhatsApp connecté</span>
                </WaConnected>
              ) : whatsappStatus === 'qr' && whatsappQr ? (
                <>
                  <WaInstruction>Scannez ce QR code avec votre téléphone pour connecter WhatsApp.</WaInstruction>
                  <WaQrImg src={whatsappQr} alt="QR Code WhatsApp" />
                  <WaHint>Ouvrez WhatsApp &gt; Appareils connectés &gt; Connecter un appareil</WaHint>
                </>
              ) : (
                <WaWaiting>
                  <RefreshCw size={24} className="spin" color="#3b82f6" />
                  <span>
                    {whatsappStatus === 'initializing' ? 'Initialisation en cours…' : 'En attente du QR code…'}
                  </span>
                </WaWaiting>
              )}
            </WaSection>
          ) : activeSection === 'stats' ? (
            <>
              <StatsSummaryRow>
                <StatSummaryCard>
                  <StatSummaryIcon $color="#3b82f6"><TrendingUp size={20} /></StatSummaryIcon>
                  <StatSummaryContent>
                    <StatSummaryValue>{totalDetections}</StatSummaryValue>
                    <StatSummaryLabel>Total 30 jours</StatSummaryLabel>
                  </StatSummaryContent>
                </StatSummaryCard>
                <StatSummaryCard>
                  <StatSummaryIcon $color="#f59e0b"><BarChart2 size={20} /></StatSummaryIcon>
                  <StatSummaryContent>
                    <StatSummaryValue>{peakDetections}</StatSummaryValue>
                    <StatSummaryLabel>Pic journalier</StatSummaryLabel>
                  </StatSummaryContent>
                </StatSummaryCard>
                <StatSummaryCard>
                  <StatSummaryIcon $color="#10b981"><Activity size={20} /></StatSummaryIcon>
                  <StatSummaryContent>
                    <StatSummaryValue>{avgDetections}</StatSummaryValue>
                    <StatSummaryLabel>Moyenne / jour</StatSummaryLabel>
                  </StatSummaryContent>
                </StatSummaryCard>
              </StatsSummaryRow>

              <ChartSection>
                <ChartHeader>
                  <ChartTitle>
                    <BarChart2 size={18} color="#3b82f6" />
                    Détections — 30 derniers jours
                  </ChartTitle>
                  <DownloadChartBtn onClick={handleDownloadChart}>
                    <Download size={14} />
                    Télécharger
                  </DownloadChartBtn>
                </ChartHeader>
                <ChartWrapper>
                  <Bar ref={chartRef} data={chartData} options={chartOptions} />
                </ChartWrapper>
              </ChartSection>
            </>
          ) : (
            <>
              {/* KPI Summary Row */}
              <KpiRow>
                <KpiCard>
                  <KpiIcon $color="#3b82f6"><Layers size={20} /></KpiIcon>
                  <KpiContent>
                    <KpiValue>{containers.length}</KpiValue>
                    <KpiLabel>Total détectés</KpiLabel>
                  </KpiContent>
                </KpiCard>
                <KpiCard>
                  <KpiIcon $color="#6366f1"><Camera size={20} /></KpiIcon>
                  <KpiContent>
                    <KpiValue>{camerasList.length}</KpiValue>
                    <KpiLabel>Caméras actives</KpiLabel>
                  </KpiContent>
                </KpiCard>
                <KpiCard>
                  <KpiIcon $color="#10b981"><Activity size={20} /></KpiIcon>
                  <KpiContent>
                    <KpiValue>{totalThisMonth}</KpiValue>
                    <KpiLabel>Ce mois-ci</KpiLabel>
                  </KpiContent>
                </KpiCard>
                <KpiCard>
                  <KpiIcon $color="#f59e0b"><Users size={20} /></KpiIcon>
                  <KpiContent>
                    <KpiValue>{teams.length}</KpiValue>
                    <KpiLabel>Équipes</KpiLabel>
                  </KpiContent>
                </KpiCard>
              </KpiRow>

              {camerasList.length > 0 && (
                <>
                  <SectionTitle>
                    <Video size={16} color="#64748b" />
                    Filtrer par caméra
                    {selectedCamera && (
                      <ClearFilterBtn onClick={() => setSelectedCamera(null)}>
                        <X size={12} /> Effacer
                      </ClearFilterBtn>
                    )}
                  </SectionTitle>
                  <CamerasGrid>
                    {camerasList.map((cam) => {
                      const camId = String(cam._id);
                      const isActive = selectedCamera === camId;
                      const camCount = containers.filter(c => String(c.camera_id) === camId).length;
                      return (
                        <CameraCard
                          key={cam._id}
                          className={isActive ? 'active' : ''}
                          onClick={() => setSelectedCamera(isActive ? null : camId)}
                        >
                          <CardHeader>
                            <Video size={20} color={isActive ? '#3b82f6' : '#64748b'} />
                            <h3>{cam.name}</h3>
                          </CardHeader>
                          <CardBody>
                            {cam.ip_address && (
                              <span className="label" style={{ fontSize: '11px', fontFamily: 'monospace', color: '#60a5fa' }}>{cam.ip_address}</span>
                            )}
                            <CameraCountBadge $active={isActive}>{camCount} scan(s)</CameraCountBadge>
                          </CardBody>
                        </CameraCard>
                      );
                    })}
                  </CamerasGrid>

                  {selectedCamera && (() => {
                    const cam = camerasList.find(c => String(c._id) === selectedCamera);
                    const assignedTeams = teams.filter(t => (t.camera_ids || []).includes(selectedCamera));
                    return (
                      <CameraInfoPanel>
                        <CameraInfoHeader>
                          <span><Camera size={14} /> {cam?.name} — {filteredContainers.length} conteneur(s) détecté(s)</span>
                          <TeamIconBtn onClick={() => setSelectedCamera(null)} title="Effacer le filtre"><X size={14} /></TeamIconBtn>
                        </CameraInfoHeader>
                        {assignedTeams.length > 0 && (
                          <CameraTeamsRow>
                            <span style={{ color: '#94a3b8', fontSize: '12px', marginRight: 8 }}>Équipes :</span>
                            {assignedTeams.map(t => (
                              <CameraTeamChip key={t._id}>
                                <Crown size={11} color="#f59e0b" />
                                <strong>{t.name}</strong>
                                <span style={{ color: '#94a3b8' }}>— {t.leader_name}</span>
                                {(t.members || []).length > 0 && (
                                  <span style={{ color: '#64748b', fontSize: '11px' }}> · {t.members.join(', ')}</span>
                                )}
                              </CameraTeamChip>
                            ))}
                          </CameraTeamsRow>
                        )}
                      </CameraInfoPanel>
                    );
                  })()}
                </>
              )}

              {error ? (
                <ErrorMessage>{error}</ErrorMessage>
              ) : (
                <TableContainer>
                  <TableHeader>
                    <TableTitle>
                      <Package size={15} color="#64748b" />
                      Conteneurs scannés
                    </TableTitle>
                    <ResultCount>{filteredContainers.length} résultat(s)</ResultCount>
                  </TableHeader>
                  <Table>
                    <thead>
                      <tr>
                        <th>Caméra</th>
                        <th>Code Conteneur</th>
                        <th>Code ISO</th>
                        <th>Entreprise</th>
                        <th>Date d'ajout</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan="6" className="text-center">
                          <LoadingRow>
                            <RefreshCw size={18} className="spin" />
                            Chargement...
                          </LoadingRow>
                        </td></tr>
                      ) : filteredContainers.length > 0 ? (
                        filteredContainers.map((container, index) => (
                          <tr key={index}>
                            <td>
                              <CameraCell>
                                <Camera size={13} color="#475569" />
                                {(() => { const cam = camerasList.find(c => String(c._id) === String(container.camera_id)); return cam ? cam.name : `Caméra ${container.camera_id || '1'}`; })()}
                              </CameraCell>
                            </td>
                            <td><strong>{container.container_code}</strong></td>
                            <td><Badge>{container.iso_code}</Badge></td>
                            <td>{container.shipping_company || <span style={{ color: '#475569', fontStyle: 'italic' }}>Non spécifié</span>}</td>
                            <td style={{ color: '#64748b', fontSize: '13px' }}>{new Date(container.created_at).toLocaleString()}</td>
                            <td>
                              <RowActions>
                                <TeamIconBtn title="Modifier" onClick={() => { setEditingContainer(container); setEditContainerData({ container_code: container.container_code, iso_code: container.iso_code, shipping_company: container.shipping_company }); }}><Pencil size={13} /></TeamIconBtn>
                                <TeamIconBtn $danger title="Supprimer" onClick={() => handleDeleteContainer(container._id)}><Trash2 size={13} /></TeamIconBtn>
                              </RowActions>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="text-center">
                            <EmptyTableState>
                              <EmptyIcon><Package size={32} /></EmptyIcon>
                              <EmptyTitle>Aucun conteneur trouvé</EmptyTitle>
                              {searchTerm && <p>Essayez de modifier votre recherche.</p>}
                            </EmptyTableState>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
        </ContentArea>
      </MainContent>

      {/* Edit Container Modal */}
      {editingContainer && (
        <ModalOverlay onClick={() => setEditingContainer(null)}>
          <ModalBox onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <h3>Modifier le conteneur</h3>
              <ModalCloseBtn onClick={() => setEditingContainer(null)}><X size={18} /></ModalCloseBtn>
            </ModalHeader>
            <ModalBody>
              <ModalField>
                <label>Code Conteneur</label>
                <input type="text" value={editContainerData.container_code || ''} onChange={e => setEditContainerData(p => ({ ...p, container_code: e.target.value }))} />
              </ModalField>
              <ModalField>
                <label>Code ISO</label>
                <input type="text" value={editContainerData.iso_code || ''} onChange={e => setEditContainerData(p => ({ ...p, iso_code: e.target.value }))} />
              </ModalField>
              <ModalField>
                <label>Entreprise</label>
                <input type="text" value={editContainerData.shipping_company || ''} onChange={e => setEditContainerData(p => ({ ...p, shipping_company: e.target.value }))} />
              </ModalField>
            </ModalBody>
            <ModalFooter>
              <ModalCancelBtn onClick={() => setEditingContainer(null)}>Annuler</ModalCancelBtn>
              <ModalConfirmBtn onClick={handleUpdateContainer}>Enregistrer</ModalConfirmBtn>
            </ModalFooter>
          </ModalBox>
        </ModalOverlay>
      )}

      {/* Manage Members Modal */}
      {managingMembersTeam && (
        <ModalOverlay onClick={() => setManagingMembersTeam(null)}>
          <ModalBox onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <h3>Membres — {managingMembersTeam.name}</h3>
              <ModalCloseBtn onClick={() => setManagingMembersTeam(null)}><X size={18} /></ModalCloseBtn>
            </ModalHeader>
            <ModalBody>
              <CameraAddForm>
                <input
                  type="text"
                  placeholder="Nom du membre"
                  value={addMemberInput}
                  onChange={e => setAddMemberInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddMemberToTeam()}
                  autoFocus
                />
                <AddMemberBtn type="button" onClick={handleAddMemberToTeam}><Plus size={15} /></AddMemberBtn>
              </CameraAddForm>
              <CameraManageList>
                {(managingMembersTeam.members || []).length === 0 ? (
                  <NoCameras>Aucun membre.</NoCameras>
                ) : (managingMembersTeam.members).map((m, i) => (
                  <CameraManageItem key={i}>
                    <Users size={13} color="#60a5fa" />
                    <span>{m}</span>
                    <TeamIconBtn $danger onClick={() => handleRemoveMemberFromTeam(m)}><Trash2 size={13} /></TeamIconBtn>
                  </CameraManageItem>
                ))}
              </CameraManageList>
            </ModalBody>
            <ModalFooter>
              <ModalConfirmBtn onClick={() => setManagingMembersTeam(null)}>Fermer</ModalConfirmBtn>
            </ModalFooter>
          </ModalBox>
        </ModalOverlay>
      )}
    </DashboardContainer>
  );
}

/* ─── Animations ─────────────────────────────────────────────── */

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  100% { transform: rotate(360deg); }
`;

/* ─── Layout ─────────────────────────────────────────────────── */

const DashboardContainer = styled.div`
  display: flex;
  height: 100vh;
  background-color: #0f172a;
  color: #f8fafc;
  font-family: 'Inter', 'Roboto', sans-serif;
`;

const Sidebar = styled.aside`
  width: 260px;
  background: linear-gradient(180deg, #1a2540 0%, #1e293b 100%);
  border-right: 1px solid #1e3a5f30;
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
  flex-shrink: 0;

  /* Custom scrollbar */
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
`;

const LogoArea = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 32px;
  padding: 0 8px;
`;

const LogoIcon = styled.div`
  width: 40px;
  height: 40px;
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const LogoText = styled.div`
  h2 {
    font-size: 17px;
    font-weight: 700;
    margin: 0 0 2px;
    color: #f1f5f9;
    span { color: #3b82f6; }
  }
  p {
    margin: 0;
    font-size: 11px;
    color: #475569;
    font-weight: 500;
  }
`;

const NavSectionLabel = styled.span`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: #334155;
  padding: 0 8px;
  margin-bottom: 8px;
`;

const NavItems = styled.nav`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const NavItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  color: #64748b;
  transition: all 0.15s ease;
  position: relative;

  &:hover {
    background-color: rgba(51, 65, 85, 0.6);
    color: #cbd5e1;
  }

  &.active {
    background: linear-gradient(90deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.05));
    color: #60a5fa;
    border-left: 3px solid #3b82f6;
    padding-left: 9px;
  }
`;

const NavBadge = styled.span`
  margin-left: auto;
  background: ${({ $danger }) => $danger ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)'};
  color: ${({ $danger }) => $danger ? '#f87171' : '#60a5fa'};
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 7px;
`;

const SidebarFooter = styled.div`
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #1e293b;
`;

const LogoutBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  width: 100%;
  background: rgba(239, 68, 68, 0.08);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.18);
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.16);
    border-color: rgba(239, 68, 68, 0.35);
  }
`;

const SidebarDivider = styled.span`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: #334155;
  padding: 12px 8px 4px;
`;

const SidebarExportBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 13px;
  transition: all 0.15s ease;
  border: 1px solid ${({ $pdf }) => $pdf ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'};
  background: ${({ $pdf }) => $pdf ? 'rgba(239, 68, 68, 0.06)' : 'rgba(34, 197, 94, 0.06)'};
  color: ${({ $pdf }) => $pdf ? '#f87171' : '#4ade80'};
  width: 100%;

  &:hover:not(:disabled) {
    background: ${({ $pdf }) => $pdf ? 'rgba(239, 68, 68, 0.14)' : 'rgba(34, 197, 94, 0.14)'};
  }

  &:disabled { opacity: 0.5; cursor: not-allowed; }

  .spin { animation: ${spin} 1s linear infinite; }
`;

/* ─── Main ───────────────────────────────────────────────────── */

const MainContent = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 32px;
  background: #1e293b;
  border-bottom: 1px solid #1e3a5f40;
  flex-shrink: 0;
`;

const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;

  h1 {
    font-size: 22px;
    font-weight: 700;
    margin: 0;
    color: #f1f5f9;
    letter-spacing: -0.3px;
  }
`;

const HeaderSubtitle = styled.span`
  font-size: 13px;
  color: #475569;
  font-weight: 500;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: #0f172a;
  border: 1px solid #1e3a5f;
  padding: 8px 14px;
  border-radius: 8px;
  width: 260px;
  transition: border-color 0.15s;

  &:focus-within {
    border-color: #3b82f6;
  }

  input {
    border: none;
    background: transparent;
    outline: none;
    width: 100%;
    color: #f8fafc;
    font-size: 13px;
    &::placeholder { color: #475569; }
  }
`;

const RefreshBtn = styled.button`
  background: #0f172a;
  border: 1px solid #1e3a5f;
  border-radius: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #64748b;
  transition: all 0.15s ease;
  flex-shrink: 0;

  &:hover {
    background: #0d1a2e;
    color: #3b82f6;
    border-color: rgba(59, 130, 246, 0.4);
  }

  .spin { animation: ${spin} 1s linear infinite; }
`;

const ContentArea = styled.div`
  padding: 28px 32px;
  overflow-y: auto;
  flex: 1;
  animation: ${fadeIn} 0.25s ease;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 4px; }
  &::-webkit-scrollbar-thumb:hover { background: #334155; }
`;

/* ─── KPI Cards ──────────────────────────────────────────────── */

const KpiRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 28px;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const KpiCard = styled.div`
  background: #1e293b;
  border: 1px solid #1e3a5f;
  border-radius: 12px;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: border-color 0.15s, transform 0.15s;

  &:hover {
    border-color: #334155;
    transform: translateY(-1px);
  }
`;

const KpiIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${({ $color }) => `${$color}18`};
  border: 1px solid ${({ $color }) => `${$color}30`};
  color: ${({ $color }) => $color};
`;

const KpiContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const KpiValue = styled.span`
  font-size: 24px;
  font-weight: 700;
  color: #f1f5f9;
  line-height: 1;
`;

const KpiLabel = styled.span`
  font-size: 12px;
  color: #475569;
  font-weight: 500;
`;

/* ─── Section title ──────────────────────────────────────────── */

const SectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin-bottom: 12px;
`;

const ClearFilterBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #f87171;
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  &:hover { background: rgba(239, 68, 68, 0.15); }
`;

/* ─── Table ──────────────────────────────────────────────────── */

const TableContainer = styled.div`
  background: #1e293b;
  border-radius: 12px;
  border: 1px solid #1e3a5f;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  overflow: hidden;
`;

const TableHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid #1e3a5f;
  background: #192235;
`;

const TableTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ResultCount = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  background: #0f172a;
  border: 1px solid #1e3a5f;
  border-radius: 20px;
  padding: 2px 10px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: 13px 20px;
    text-align: left;
    border-bottom: 1px solid #1a2540;
  }

  th {
    background: #192235;
    font-weight: 600;
    color: #475569;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.6px;
  }

  td {
    color: #94a3b8;
    font-size: 13px;

    strong {
      color: #e2e8f0;
      font-weight: 600;
      font-size: 14px;
    }

    &.text-center {
      text-align: center;
      color: #334155;
      padding: 40px 20px;
    }
  }

  tbody tr {
    transition: background-color 0.1s ease;
    &:hover { background: rgba(15, 23, 42, 0.5); }
    &:last-child td { border-bottom: none; }
  }
`;

const CameraCell = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: #64748b;
  font-size: 13px;
`;

const Badge = styled.span`
  background: rgba(59, 130, 246, 0.12);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.25);
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  font-family: monospace;
`;

const LoadingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #334155;
  padding: 20px;
  .spin { animation: ${spin} 1s linear infinite; }
`;

const EmptyTableState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 0;
  p { margin: 0; color: #334155; font-size: 13px; }
`;

/* ─── Empty States ───────────────────────────────────────────── */

const EmptyIcon = styled.div`
  color: #1e3a5f;
  margin-bottom: 4px;
`;

const EmptyTitle = styled.p`
  font-size: 15px;
  font-weight: 600;
  color: #334155;
  margin: 0;
`;

const EmptyTeams = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px 0;
  color: #334155;
  text-align: center;

  p { margin: 0; line-height: 1.6; font-size: 14px; }
  strong { color: #475569; }
  .spin { animation: ${spin} 1s linear infinite; }
`;

const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.08);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.2);
  padding: 14px 18px;
  border-radius: 10px;
  font-weight: 500;
  font-size: 14px;
`;

/* ─── Stats Section ──────────────────────────────────────────── */

const StatsSummaryRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
`;

const StatSummaryCard = styled.div`
  background: #1e293b;
  border: 1px solid #1e3a5f;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: border-color 0.15s;
  &:hover { border-color: #334155; }
`;

const StatSummaryIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${({ $color }) => `${$color}18`};
  border: 1px solid ${({ $color }) => `${$color}30`};
  color: ${({ $color }) => $color};
`;

const StatSummaryContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const StatSummaryValue = styled.span`
  font-size: 26px;
  font-weight: 700;
  color: #f1f5f9;
  line-height: 1;
`;

const StatSummaryLabel = styled.span`
  font-size: 12px;
  color: #475569;
  font-weight: 500;
`;

const ChartSection = styled.div`
  background: #1e293b;
  border: 1px solid #1e3a5f;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
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
  gap: 8px;
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #cbd5e1;
`;

const ChartWrapper = styled.div`
  height: 320px;
`;

const DownloadChartBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  background: rgba(59, 130, 246, 0.08);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: 7px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.15s ease;
  &:hover { background: rgba(59, 130, 246, 0.16); }
`;

/* ─── Camera Cards ───────────────────────────────────────────── */

const CamerasGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
`;

const CameraCard = styled.div`
  background: #1e293b;
  border-radius: 10px;
  padding: 14px 16px;
  border: 1px solid #1e3a5f;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: #334155;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
  }

  &.active {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.08);
    box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.3);
    h3 { color: #60a5fa; }
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;

  h3 {
    margin: 0;
    font-size: 13px;
    color: #cbd5e1;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color 0.15s;
  }
`;

const CardBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  .label {
    font-size: 11px;
    color: #60a5fa;
    font-family: monospace;
  }
`;

const CameraCountBadge = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
  background: ${({ $active }) => $active ? 'rgba(59,130,246,0.15)' : 'rgba(71,85,105,0.3)'};
  color: ${({ $active }) => $active ? '#60a5fa' : '#475569'};
  border: 1px solid ${({ $active }) => $active ? 'rgba(59,130,246,0.3)' : 'transparent'};
`;

const CameraInfoPanel = styled.div`
  background: #1e293b;
  border: 1px solid rgba(59, 130, 246, 0.35);
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const CameraInfoHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: #60a5fa;
  font-weight: 600;
  gap: 8px;
  svg { vertical-align: middle; }
`;

const CameraTeamsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`;

const CameraTeamChip = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 7px;
  padding: 4px 10px;
  font-size: 12px;
  color: #f8fafc;
`;

/* ─── Teams ──────────────────────────────────────────────────── */

const TeamsToolbar = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-bottom: 20px;
`;

const ManageCamerasBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  background: rgba(99, 102, 241, 0.1);
  color: #a5b4fc;
  border: 1px solid rgba(99, 102, 241, 0.25);
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.15s ease;
  &:hover { background: rgba(99, 102, 241, 0.18); }
`;

const AddTeamBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  background: ${({ $warning }) => $warning ? 'rgba(245, 158, 11, 0.12)' : 'rgba(59, 130, 246, 0.12)'};
  color: ${({ $warning }) => $warning ? '#fbbf24' : '#60a5fa'};
  border: 1px solid ${({ $warning }) => $warning ? 'rgba(245, 158, 11, 0.3)' : 'rgba(59, 130, 246, 0.3)'};
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.15s ease;
  &:hover { background: ${({ $warning }) => $warning ? 'rgba(245, 158, 11, 0.22)' : 'rgba(59, 130, 246, 0.22)'}; }
`;

const TeamsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
`;

const TeamCard = styled.div`
  background: #1e293b;
  border: 1px solid #1e3a5f;
  border-radius: 12px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color 0.15s, transform 0.15s;

  &:hover {
    border-color: #334155;
    transform: translateY(-1px);
  }
`;

const TeamCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const TeamName = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #f1f5f9;
`;

const TeamActions = styled.div`
  display: flex;
  gap: 6px;
`;

const TeamIconBtn = styled.button`
  background: ${({ $danger }) => $danger ? 'rgba(239,68,68,0.08)' : 'rgba(59,130,246,0.08)'};
  border: 1px solid ${({ $danger }) => $danger ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)'};
  color: ${({ $danger }) => $danger ? '#f87171' : '#60a5fa'};
  border-radius: 6px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    background: ${({ $danger }) => $danger ? 'rgba(239,68,68,0.16)' : 'rgba(59,130,246,0.16)'};
  }
`;

const LeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #64748b;
  span { color: #cbd5e1; font-weight: 500; }
`;

const CameraBadgesRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  min-height: 26px;
`;

const CamBadge = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(99, 102, 241, 0.1);
  color: #a5b4fc;
  border: 1px solid rgba(99, 102, 241, 0.2);
  padding: 2px 9px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
`;

const RowActions = styled.div`
  display: flex;
  gap: 4px;
  justify-content: flex-end;
`;

const NoCameras = styled.span`
  font-size: 12px;
  color: #334155;
  font-style: italic;
`;

const MembersSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const MembersLabel = styled.span`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #334155;
`;

const MembersList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`;

const MemberTag = styled.span`
  background: rgba(16, 185, 129, 0.08);
  color: #6ee7b7;
  border: 1px solid rgba(16, 185, 129, 0.18);
  padding: 2px 9px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
`;

/* ─── Modals ─────────────────────────────────────────────────── */

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: ${fadeIn} 0.15s ease;
`;

const ModalBox = styled.div`
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 14px;
  width: 420px;
  max-width: 95vw;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
  animation: ${fadeIn} 0.2s ease;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px 14px;
  border-bottom: 1px solid #1e3a5f;
  h3 { margin: 0; font-size: 15px; font-weight: 700; color: #f1f5f9; }
`;

const ModalCloseBtn = styled.button`
  background: none;
  border: none;
  color: #475569;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 2px;
  border-radius: 5px;
  &:hover { color: #f1f5f9; background: #334155; }
`;

const ModalBody = styled.div`
  padding: 18px 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const ModalField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 11px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }

  input, select {
    background: #0f172a;
    border: 1px solid #1e3a5f;
    border-radius: 8px;
    padding: 9px 13px;
    color: #f1f5f9;
    font-size: 14px;
    outline: none;
    transition: border-color 0.15s;
    &:focus { border-color: #3b82f6; }
    &::placeholder { color: #334155; }
    option { background: #1e293b; color: #f1f5f9; }
  }
`;

const ModalError = styled.p`
  margin: 0;
  color: #f87171;
  font-size: 13px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  padding: 8px 12px;
  border-radius: 7px;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 22px 18px;
  border-top: 1px solid #1e3a5f;
`;

const ModalCancelBtn = styled.button`
  padding: 8px 16px;
  background: transparent;
  border: 1px solid #1e3a5f;
  color: #64748b;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  &:hover { background: #1e3a5f; color: #cbd5e1; }
`;

const ModalConfirmBtn = styled.button`
  padding: 8px 18px;
  background: #3b82f6;
  border: none;
  color: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: background 0.15s;
  &:hover { background: #2563eb; }
`;

/* ─── Camera/Member forms ────────────────────────────────────── */

const MemberInputRow = styled.div`
  display: flex;
  gap: 8px;

  input {
    flex: 1;
    background: #0f172a;
    border: 1px solid #1e3a5f;
    border-radius: 8px;
    padding: 9px 13px;
    color: #f1f5f9;
    font-size: 14px;
    outline: none;
    transition: border-color 0.15s;
    &:focus { border-color: #3b82f6; }
    &::placeholder { color: #334155; }
  }
`;

const AddMemberBtn = styled.button`
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.25);
  color: #60a5fa;
  border-radius: 8px;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
  &:hover { background: rgba(59, 130, 246, 0.22); }
`;

const MembersTagList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
`;

const MemberTagEdit = styled.span`
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(16, 185, 129, 0.08);
  color: #6ee7b7;
  border: 1px solid rgba(16, 185, 129, 0.18);
  padding: 3px 8px 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;

  button {
    background: none;
    border: none;
    color: #6ee7b7;
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 0;
    opacity: 0.6;
    &:hover { opacity: 1; }
  }
`;

const CameraManageList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 240px;
  overflow-y: auto;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
`;

const CameraManageItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  background: #0f172a;
  border: 1px solid #1e3a5f;
  border-radius: 8px;
  transition: border-color 0.15s;
  &:hover { border-color: #334155; }

  span {
    flex: 1;
    font-size: 13px;
    color: #cbd5e1;
    font-weight: 500;
  }
`;

const CameraCodeBadge = styled.span`
  flex: 0 !important;
  background: rgba(99, 102, 241, 0.1);
  color: #a5b4fc;
  border: 1px solid rgba(99, 102, 241, 0.2);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  font-family: monospace;
  white-space: nowrap;
`;

const CameraAddForm = styled.div`
  display: flex;
  gap: 8px;

  input {
    flex: 1;
    background: #0f172a;
    border: 1px solid #1e3a5f;
    border-radius: 8px;
    padding: 9px 13px;
    color: #f1f5f9;
    font-size: 14px;
    outline: none;
    transition: border-color 0.15s;
    &:focus { border-color: #3b82f6; }
    &::placeholder { color: #334155; }
  }
`;

const CameraCheckGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

const CameraCheckItem = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid ${({ $checked }) => $checked ? 'rgba(59,130,246,0.35)' : '#1e3a5f'};
  background: ${({ $checked }) => $checked ? 'rgba(59,130,246,0.08)' : '#0f172a'};
  cursor: ${({ $disabled }) => $disabled ? 'not-allowed' : 'pointer'};
  opacity: ${({ $disabled }) => $disabled ? 0.45 : 1};
  transition: all 0.15s;
  font-size: 13px;
  color: ${({ $checked }) => $checked ? '#93c5fd' : '#64748b'};
  font-weight: 500;
  position: relative;

  &:hover {
    border-color: ${({ $disabled }) => $disabled ? '#1e3a5f' : 'rgba(59,130,246,0.4)'};
  }
`;

const OwnedTag = styled.span`
  font-size: 10px;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.2);
  padding: 1px 6px;
  border-radius: 4px;
  margin-left: auto;
`;

/* ─── Stops section ──────────────────────────────────────────── */

const StopTeamCell = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 500;
  color: #cbd5e1;
`;

const DelayBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 20px;
  background: ${({ $active }) => $active ? 'rgba(239, 68, 68, 0.12)' : 'rgba(71, 85, 105, 0.25)'};
  color: ${({ $active }) => $active ? '#f87171' : '#94a3b8'};
  border: 1px solid ${({ $active }) => $active ? 'rgba(239, 68, 68, 0.25)' : 'transparent'};
`;

/* ─── WhatsApp Section ──────────────────────────────────────── */

const WaSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 20px;
`;

const WaInstruction = styled.p`
  color: #94a3b8;
  font-size: 15px;
  margin: 0;
  text-align: center;
`;

const WaHint = styled.p`
  color: #475569;
  font-size: 13px;
  margin: 0;
  text-align: center;
`;

const WaQrImg = styled.img`
  width: 260px;
  height: 260px;
  border-radius: 16px;
  border: 3px solid #25D366;
  background: #fff;
  padding: 8px;
`;

const WaConnected = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
  color: #34d399;
`;

const WaConnectedDot = styled.div`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #25D366;
  box-shadow: 0 0 8px #25D366;
`;

const WaWaiting = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  color: #94a3b8;
  font-size: 15px;
  .spin { animation: ${spin} 1s linear infinite; }
`;

const StopStatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 20px;
  background: ${({ $active }) => $active ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)'};
  color: ${({ $active }) => $active ? '#f87171' : '#34d399'};
  border: 1px solid ${({ $active }) => $active ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;
