import { useState, useEffect, useCallback } from 'react'
import './App.css'

const STATUS_LABEL = {
  disconnected: { text: 'Déconnecté', color: '#ef4444' },
  initializing: { text: 'Connexion…', color: '#f59e0b' },
  qr: { text: 'Scan QR requis', color: '#f59e0b' },
  ready: { text: 'Connecté', color: '#22c55e' },
}

export default function App() {
  const [scans, setScans] = useState([])
  const [selected, setSelected] = useState(null)
  const [generatedMsg, setGeneratedMsg] = useState('')
  const [waStatus, setWaStatus] = useState('disconnected')
  const [qrCode, setQrCode] = useState(null)
  const [phone, setPhone] = useState('0600001716')
  const [loadingScans, setLoadingScans] = useState(false)
  const [loadingGen, setLoadingGen] = useState(false)
  const [loadingSend, setLoadingSend] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Poll WhatsApp status
  const pollStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/whatsapp/status')
      const d = await r.json()
      setWaStatus(d.status)
      setQrCode(d.qr || null)
    } catch {}
  }, [])

  useEffect(() => {
    loadScans()
    pollStatus()
    const id = setInterval(pollStatus, 3000)
    return () => clearInterval(id)
  }, [pollStatus])

  async function loadScans() {
    setLoadingScans(true)
    try {
      const r = await fetch('/api/scans')
      const data = await r.json()
      setScans(data)
    } catch (e) {
      showToast('Erreur chargement scans: ' + e.message, 'error')
    } finally {
      setLoadingScans(false)
    }
  }

  async function connectWhatsApp() {
    await fetch('/api/whatsapp/init', { method: 'POST' })
    setWaStatus('initializing')
  }

  async function generateMessage() {
    if (!selected) return
    setLoadingGen(true)
    setGeneratedMsg('')
    try {
      const r = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scan: selected }),
      })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      setGeneratedMsg(d.message)
    } catch (e) {
      showToast('Erreur Ollama: ' + e.message, 'error')
    } finally {
      setLoadingGen(false)
    }
  }

  async function sendWhatsApp() {
    if (!generatedMsg) return
    setLoadingSend(true)
    try {
      const r = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: generatedMsg, number: phone }),
      })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      showToast('Message envoyé avec succès ✓')
    } catch (e) {
      showToast('Erreur envoi: ' + e.message, 'error')
    } finally {
      setLoadingSend(false)
    }
  }

  const statusInfo = STATUS_LABEL[waStatus] || STATUS_LABEL.disconnected

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <span className="logo-text">MARSA</span>
          <span className="logo-sub">MAROC</span>
          <span className="header-title">Notifications Scan</span>
        </div>
        <div className="header-right">
          <span className="wa-dot" style={{ background: statusInfo.color }} />
          <span className="wa-label">WhatsApp : {statusInfo.text}</span>
          {(waStatus === 'disconnected') && (
            <button className="btn btn-sm" onClick={connectWhatsApp}>
              Connecter
            </button>
          )}
        </div>
      </header>

      {/* QR Code overlay */}
      {qrCode && (
        <div className="qr-banner">
          <p>Scannez ce QR avec WhatsApp pour connecter :</p>
          <img src={qrCode} alt="QR WhatsApp" className="qr-img" />
        </div>
      )}

      <div className="main">
        {/* Scans list */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>Scans récents</h2>
            <button className="btn btn-sm" onClick={loadScans} disabled={loadingScans}>
              {loadingScans ? '…' : '↺'}
            </button>
          </div>
          {loadingScans && <p className="muted">Chargement…</p>}
          <ul className="scan-list">
            {scans.map((s) => (
              <li
                key={s._id}
                className={`scan-item ${selected?._id === s._id ? 'active' : ''}`}
                onClick={() => { setSelected(s); setGeneratedMsg('') }}
              >
                <span className="scan-code">{s.container_code || '—'}</span>
                <span className={`iso-badge ${s.iso_code === 'Non Scanné' ? 'warn' : 'ok'}`}>
                  {s.iso_code || '—'}
                </span>
                <span className="scan-date">
                  {s.created_at ? new Date(s.created_at).toLocaleDateString('fr-FR') : '—'}
                </span>
              </li>
            ))}
            {!loadingScans && scans.length === 0 && (
              <p className="muted">Aucun scan trouvé.</p>
            )}
          </ul>
        </aside>

        {/* Detail panel */}
        <main className="detail">
          {!selected ? (
            <div className="empty-state">
              <p>← Sélectionnez un scan pour générer un message</p>
            </div>
          ) : (
            <>
              <section className="card">
                <h2>Détails du scan</h2>
                <div className="scan-grid">
                  <div className="field">
                    <label>Code conteneur</label>
                    <value>{selected.container_code || '—'}</value>
                  </div>
                  <div className="field">
                    <label>Code ISO</label>
                    <value className={selected.iso_code === 'Non Scanné' ? 'warn-text' : ''}>
                      {selected.iso_code || '—'}
                    </value>
                  </div>
                  <div className="field">
                    <label>Compagnie</label>
                    <value>{selected.shipping_company || '—'}</value>
                  </div>
                  <div className="field">
                    <label>Date</label>
                    <value>
                      {selected.created_at
                        ? new Date(selected.created_at).toLocaleString('fr-FR')
                        : '—'}
                    </value>
                  </div>
                </div>
                {/* Scan image */}
                <div className="scan-img-wrap">
                  <img
                    src={`/api/scans/${selected._id}/image`}
                    alt="Screenshot scan"
                    className="scan-img"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                </div>
              </section>

              <section className="card">
                <div className="card-header">
                  <h2>Message Ollama</h2>
                  <button className="btn" onClick={generateMessage} disabled={loadingGen}>
                    {loadingGen ? 'Génération…' : '✦ Générer'}
                  </button>
                </div>
                <textarea
                  className="msg-area"
                  value={generatedMsg}
                  onChange={(e) => setGeneratedMsg(e.target.value)}
                  placeholder="Cliquez sur « Générer » pour créer un message avec Ollama…"
                  rows={6}
                />
              </section>

              <section className="card send-section">
                <h2>Envoyer via WhatsApp</h2>
                <div className="send-row">
                  <div className="field">
                    <label>Numéro destinataire</label>
                    <input
                      className="phone-input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="ex: 0600001716"
                    />
                  </div>
                  <button
                    className="btn btn-green"
                    onClick={sendWhatsApp}
                    disabled={loadingSend || !generatedMsg || waStatus !== 'ready'}
                  >
                    {loadingSend ? 'Envoi…' : '📱 Envoyer'}
                  </button>
                </div>
                {waStatus !== 'ready' && (
                  <p className="muted warn-text">
                    WhatsApp non connecté — cliquez sur « Connecter » en haut.
                  </p>
                )}
              </section>
            </>
          )}
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  )
}
