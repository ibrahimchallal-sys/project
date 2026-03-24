require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const fetch = require('node-fetch');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'marsa_scan';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral:7b';
const DEFAULT_WHATSAPP = process.env.WHATSAPP_NUMBER || '212600001716';

let mongoClient;
let whatsappClient;
let whatsappStatus = 'disconnected'; 
let qrCodeData = null;


const incomingMessages = [];

// ─── MongoDB ──────────────────────────────────────────────────────────────────

async function connectMongo() {
  mongoClient = new MongoClient(MONGO_URI);
  await mongoClient.connect();
  console.log('[MongoDB] Connected to', DB_NAME);
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────

function initWhatsApp() {
  if (whatsappStatus === 'initializing' || whatsappStatus === 'ready') return;
  whatsappStatus = 'initializing';

  whatsappClient = new Client({
    authStrategy: new LocalAuth({ dataPath: './whatsapp-session' }),
    puppeteer: {
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
      headless: true,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    },
  });

  whatsappClient.on('qr', async (qr) => {
    whatsappStatus = 'qr';
    qrCodeData = await qrcode.toDataURL(qr);
    console.log('[WhatsApp] QR code ready – scan with your phone');
  });

  whatsappClient.on('ready', () => {
    whatsappStatus = 'ready';
    qrCodeData = null;
    console.log('[WhatsApp] Client ready');
  });

  whatsappClient.on('disconnected', (reason) => {
    whatsappStatus = 'disconnected';
    qrCodeData = null;
    console.log('[WhatsApp] Disconnected:', reason);
  });

  whatsappClient.on('message', (msg) => {
    incomingMessages.push({
      from: msg.from,
      body: msg.body,
      timestamp: Date.now(),
    });
    console.log('[WhatsApp] Message reçu de', msg.from, ':', msg.body);
  });

  whatsappClient.initialize();
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// List scans (no screenshot binary)
app.get('/api/scans', async (req, res) => {
  try {
    const db = mongoClient.db(DB_NAME);
    const scans = await db
      .collection('scans')
      .find({}, { projection: { screenshot: 0 } })
      .sort({ created_at: -1 })
      .limit(100)
      .toArray();
    res.json(scans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve scan screenshot image
app.get('/api/scans/:id/image', async (req, res) => {
  try {
    const db = mongoClient.db(DB_NAME);
    const scan = await db
      .collection('scans')
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!scan?.screenshot) return res.status(404).end();

    let buf = scan.screenshot;
    if (buf?.buffer) buf = buf.buffer; // BSON Binary → Node Buffer
    if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);

    res.set('Content-Type', scan.screenshot_mime || 'image/jpeg');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate WhatsApp message with Ollama
app.post('/api/generate', async (req, res) => {
  const { scan } = req.body;
  if (!scan) return res.status(400).json({ error: 'Missing scan data' });

  const date = scan.created_at
    ? new Date(scan.created_at).toLocaleString('fr-FR')
    : 'Inconnue';

  const prompt =
    `Tu es un assistant pour un système de contrôle portuaire (MARSA MAROC).\n` +
    `Génère un message WhatsApp court, professionnel et clair en français pour notifier un opérateur.\n\n` +
    `Données du scan :\n` +
    `- Code conteneur : ${scan.container_code || 'N/A'}\n` +
    `- Code ISO : ${scan.iso_code || 'N/A'}\n` +
    `- Compagnie maritime : ${scan.shipping_company || 'N/A'}\n` +
    `- Date du scan : ${date}\n\n` +
    `Le message doit inclure un emoji approprié, être concis (max 5 lignes) et indiquer si une action est requise.`;

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false }),
    });

    if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
    const data = await response.json();
    res.json({ message: data.response?.trim() || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WhatsApp status + QR
app.get('/api/whatsapp/status', (req, res) => {
  res.json({ status: whatsappStatus, qr: qrCodeData });
});

// Init WhatsApp
app.post('/api/whatsapp/init', (req, res) => {
  initWhatsApp();
  res.json({ status: whatsappStatus });
});

// Send WhatsApp message
app.post('/api/whatsapp/send', async (req, res) => {
  const { message, number } = req.body;
  if (!message) return res.status(400).json({ error: 'Missing message' });

  if (whatsappStatus !== 'ready') {
    return res
      .status(400)
      .json({ error: 'WhatsApp non connecté. Scannez le QR code d\'abord.' });
  }

  // Normalize number: keep digits only, strip leading 0, prepend 212 if needed
  let num = (number || DEFAULT_WHATSAPP).replace(/\D/g, '');
  if (num.startsWith('0')) num = '212' + num.slice(1);
  const chatId = `${num}@c.us`;

  try {
    await whatsappClient.sendMessage(chatId, message);
    res.json({ success: true, sentTo: chatId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Agent Routes ─────────────────────────────────────────────────────────────

// GET /api/whatsapp/inbox?since=<timestamp_ms>
// Returns incoming messages received after `since` (default: last 5 min)
app.get('/api/whatsapp/inbox', (_req, res) => {
  const since = parseInt(_req.query.since) || (Date.now() - 5 * 60 * 1000);
  const msgs = incomingMessages.filter((m) => m.timestamp > since);
  res.json(msgs);
});

// POST /api/stops  – record a team stop with its reason
// Body: { team, stopped_at, reason, chef_number }
app.post('/api/stops', async (req, res) => {
  const { team, stopped_at, reason, chef_number } = req.body;
  if (!reason) return res.status(400).json({ error: 'Missing reason' });

  try {
    const db = mongoClient.db(DB_NAME);
    const doc = {
      team: team || 'inconnu',
      stopped_at: stopped_at ? new Date(stopped_at) : new Date(),
      reason,
      chef_number: chef_number || null,
      created_at: new Date(),
    };
    const result = await db.collection('stops').insertOne(doc);
    console.log(`[Agent] Arrêt enregistré – équipe: ${doc.team}, raison: ${reason}`);
    res.json({ success: true, id: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stops – list recent stops
app.get('/api/stops', async (_req, res) => {
  try {
    const db = mongoClient.db(DB_NAME);
    const stops = await db
      .collection('stops')
      .find({})
      .sort({ created_at: -1 })
      .limit(50)
      .toArray();
    res.json(stops);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

connectMongo()
  .then(() => {
    initWhatsApp();
    app.listen(PORT, () =>
      console.log(`[Server] Running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error('[Startup error]', err);
    process.exit(1);
  });
