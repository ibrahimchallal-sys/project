require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const multer = require('multer');
const http = require('http');
const bcrypt = require('bcryptjs');

function callOllama(prompt) {
    return new Promise((resolve) => {
        const body = JSON.stringify({
            model: process.env.OLLAMA_MODEL || 'mistral:7b',
            prompt,
            stream: false
        });

        const url = new URL(`${process.env.OLLAMA_URL || 'http://localhost:11434'}/api/generate`);
        const options = {
            hostname: url.hostname,
            port: url.port || 11434,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json.response || '');
                } catch {
                    resolve('');
                }
            });
        });

        req.on('error', () => resolve(''));
        req.setTimeout(30000, () => { req.destroy(); resolve(''); });
        req.write(body);
        req.end();
    });
}

const app = express();
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Store image in memory so we can save it as BinData in MongoDB
const upload = multer({ storage: multer.memoryStorage() });
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret-key-marsa-scan',
    resave: true,
    saveUninitialized: true,
    cookie: { 
        secure: false, // Set to true if using https
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days limit
    }
}));

const client = new MongoClient(process.env.MONGO_URI);

let db;
let containers;
let users;


async function connectDB() {
    try {
        await client.connect();

        db = client.db(process.env.DB_NAME);
        containers = db.collection("alerts");
        users = db.collection("users");

        // Always ensure the default admin user exists with the correct password
        const adminEmail = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@marsa.ma').toLowerCase();
        const hashedPassword = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || 'admin123', 10);
        await users.updateOne(
            { email: adminEmail },
            { $set: { email: adminEmail, password: hashedPassword, role: 'admin' }, $setOnInsert: { created_at: new Date() } },
            { upsert: true }
        );
        console.log("✅ Default admin user ready");

        console.log("✅ MongoDB connected");

    } catch (error) {
        console.error("❌ MongoDB connection failed:", error);
    }
}

connectDB();



app.post('/extract-code', upload.single('screenshot'), async (req, res) => {

    const { container_code, iso_size_type, shipping_company, camera_id } = req.body;

    if (!container_code) {
        return res.status(400).json({
            error: "container_code is required"
        });
    }

    try {

        const result = await containers.updateOne(

            { container_code: container_code },

            {
                $set: {
                    iso_code: iso_size_type || "Non Scanné",
                    shipping_company: shipping_company || "Non spécifié",
                    camera_id: camera_id || "1",
                    ...(req.file && {
                        screenshot: req.file.buffer,        // stored as BinData in MongoDB
                        screenshot_mime: req.file.mimetype
                    })
                },

                $setOnInsert: {
                    container_code: container_code,
                    created_at: new Date()
                }
            },

            { upsert: true }
        );

        res.json({
            message: "Container saved successfully",
            result: result
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Server error"
        });

    }

});


// ---------------- SERVE CONTAINER SCREENSHOT ----------------

app.get('/container-image/:container_code', async (req, res) => {
    try {
        const doc = await containers.findOne(
            { container_code: req.params.container_code },
            { projection: { screenshot: 1, screenshot_mime: 1 } }
        );

        if (!doc || !doc.screenshot) {
            return res.status(404).json({ error: "No image found" });
        }

        const mime = doc.screenshot_mime || 'image/jpeg';
        const buffer = Buffer.isBuffer(doc.screenshot)
            ? doc.screenshot
            : Buffer.from(doc.screenshot.buffer);

        res.set('Content-Type', mime);
        res.send(buffer);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});


// ---------------- AUTHENTICATION ----------------
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email et mot de passe requis" });
    }

    try {
        const user = await users.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            return res.status(401).json({ success: false, message: "Identifiants invalides" });
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ success: false, message: "Identifiants invalides" });
        }

        req.session.user = { email: user.email, role: user.role };
        return res.json({ success: true, message: "Connecté avec succès" });

    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: "Logged out" });
});

app.get('/auth/status', (req, res) => {
    if (req.session.user) {
        res.json({ authenticated: true, user: req.session.user });
    } else {
        res.json({ authenticated: false });
    }
});


// ---------------- GET ALL CONTAINERS ----------------

app.get('/view-data', async (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {

        // Get all containers sorted by newest (exclude binary screenshot field)
        const data = await containers
            .find({}, { projection: { screenshot: 0, screenshot_mime: 0 } })
            .sort({ created_at: -1 })
            .toArray();

        res.json(data);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Server error"
        });

    }

});

// ---------------- ALERTS COUNT ----------------

app.get('/alerts/count', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const count = await containers.countDocuments();
        res.json({ count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

// ---------------- ALERTS RECENT (LATEST 5) ----------------

app.get('/alerts/recent', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const recent = await containers
            .find({}, { projection: { screenshot: 0, screenshot_mime: 0 } })
            .sort({ created_at: -1 })
            .limit(5)
            .toArray();
        res.json(recent);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});


// ---------------- GENERATE REPORT (CSV or PDF via Ollama) ----------------

app.get('/generate-report', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const format = (req.query.format || 'csv').toLowerCase();

    try {
        // Fetch all container data
        const data = await containers
            .find({}, { projection: { screenshot: 0, screenshot_mime: 0 } })
            .sort({ created_at: -1 })
            .toArray();

        // Build statistics for Ollama prompt
        const cameraStats = {};
        const companyStats = {};

        data.forEach(c => {
            const cam = c.camera_id || '1';
            cameraStats[cam] = (cameraStats[cam] || 0) + 1;
            const company = c.shipping_company || 'Non spécifié';
            companyStats[company] = (companyStats[company] || 0) + 1;
        });

        const cameraText = Object.entries(cameraStats).map(([k, v]) => `Caméra ${k}: ${v}`).join(', ');
        const companyText = Object.entries(companyStats).slice(0, 5).map(([k, v]) => `${k}: ${v}`).join(', ');

        // Call Ollama for AI-generated analysis
        let aiSummary = `Rapport généré automatiquement. Total: ${data.length} conteneurs détectés.`;
        const ollamaResult = await callOllama(
            `Tu es un assistant d'analyse portuaire. Génère un rapport concis en français pour le système de détection de conteneurs du port de Marsa Maroc. Données: ${data.length} conteneurs détectés au total. Par caméra: ${cameraText}. Principales entreprises: ${companyText}. Génère 3-4 phrases d'analyse professionnelle incluant les statistiques clés et une conclusion opérationnelle.`
        );
        if (ollamaResult) aiSummary = ollamaResult;

        const now = new Date();
        const dateStr = now.toLocaleString('fr-FR');

        // ---- CSV ----
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="rapport_conteneurs_${now.toISOString().slice(0, 10)}.csv"`);

            let csv = '\uFEFF'; // BOM for Excel UTF-8
            csv += `Rapport de détection de conteneurs - Marsa Maroc\n`;
            csv += `Généré le: ${dateStr}\n`;
            csv += `Total conteneurs: ${data.length}\n\n`;
            csv += `Analyse IA:\n"${aiSummary.replace(/"/g, '""')}"\n\n`;
            csv += `Caméra,Code Conteneur,Code ISO,Entreprise,Date d'ajout\n`;

            data.forEach(c => {
                const cam = `Caméra ${c.camera_id || '1'}`;
                const code = c.container_code || '';
                const iso = c.iso_code || 'Non Scanné';
                const company = (c.shipping_company || 'Non spécifié').replace(/"/g, '""');
                const date = c.created_at ? new Date(c.created_at).toLocaleString('fr-FR') : '';
                csv += `"${cam}","${code}","${iso}","${company}","${date}"\n`;
            });

            return res.send(csv);
        }

        // ---- PDF ----
        if (format === 'pdf') {
            const PDFDocument = require('pdfkit');
            const logoPath = path.join(__dirname, 'assets', 'logo2.png');
            const doc = new PDFDocument({ margin: 50 });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="rapport_conteneurs_${now.toISOString().slice(0, 10)}.pdf"`);

            doc.pipe(res);

            // Logo top-left
            try {
                doc.image(logoPath, 50, 30, { height: 50 });
            } catch (_) { /* logo not found, skip */ }

            // Title block (offset right to leave room for logo)
            const titleX = 160;
            const titleY = 30;
            doc.fontSize(18).fillColor('#1f93ff').text('Rapport de Détection de Conteneurs', titleX, titleY, { width: 385 });
            doc.fontSize(11).fillColor('#475569').text('Marsa Maroc — Système de Surveillance Portuaire', titleX, doc.y, { width: 385 });
            doc.fontSize(9).fillColor('#94a3b8').text(`Généré le: ${dateStr}`, titleX, doc.y + 2, { width: 385 });

            // Move cursor below the header area and draw divider
            doc.moveDown(1);
            const headerBottom = Math.max(doc.y, 90);
            doc.moveTo(50, headerBottom).lineTo(545, headerBottom).strokeColor('#334155').lineWidth(1).stroke();
            doc.y = headerBottom + 12;

            // Statistics
            doc.fontSize(14).fillColor('#1f93ff').text('Statistiques');
            doc.moveDown(0.4);
            doc.fontSize(11).fillColor('#1e293b').text(`Total conteneurs détectés: ${data.length}`);
            Object.entries(cameraStats).forEach(([cam, count]) => {
                doc.fontSize(10).fillColor('#475569').text(`  • Caméra ${cam}: ${count} conteneur(s)`);
            });
            doc.moveDown(1);

            // AI Summary
            doc.fontSize(14).fillColor('#1f93ff').text('Analyse IA (Ollama)');
            doc.moveDown(0.4);
            doc.fontSize(11).fillColor('#1e293b').text(aiSummary, { lineGap: 4 });
            doc.moveDown(1);
            doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#334155').lineWidth(1).stroke();
            doc.moveDown(1);

            // Table
            doc.fontSize(14).fillColor('#1f93ff').text('Liste des Conteneurs');
            doc.moveDown(0.6);

            const colWidths = [65, 110, 65, 140, 115];
            const cols = ['Caméra', 'Code Conteneur', 'Code ISO', 'Entreprise', 'Date'];
            const startX = 50;
            let y = doc.y;

            // Table header
            doc.fillColor('#0f172a').rect(startX, y, 495, 20).fill();
            doc.fontSize(9).fillColor('#94a3b8');
            let x = startX + 5;
            cols.forEach((col, i) => {
                doc.text(col, x, y + 5, { width: colWidths[i] - 5, lineBreak: false });
                x += colWidths[i];
            });
            y += 20;

            // Table rows
            data.forEach((c, rowIndex) => {
                if (y > 720) {
                    doc.addPage();
                    y = 50;
                }
                const bgColor = rowIndex % 2 === 0 ? '#f8fafc' : '#f1f5f9';
                doc.fillColor(bgColor).rect(startX, y, 495, 18).fill();
                doc.fontSize(8).fillColor('#1e293b');
                x = startX + 5;
                const row = [
                    `Cam ${c.camera_id || '1'}`,
                    c.container_code || '',
                    c.iso_code || 'N/A',
                    c.shipping_company || 'Non spécifié',
                    c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR') : ''
                ];
                row.forEach((cell, i) => {
                    doc.text(cell, x, y + 4, { width: colWidths[i] - 5, lineBreak: false });
                    x += colWidths[i];
                });
                y += 18;
            });

            doc.end();
            return;
        }

        res.status(400).json({ error: "Format must be 'csv' or 'pdf'" });

    } catch (error) {
        console.error('Report generation error:', error);
        res.status(500).json({ error: "Failed to generate report" });
    }
});


// ---------------- MONTHLY STATS ----------------

app.get('/stats/monthly', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        const pipeline = [
            { $match: { created_at: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$created_at" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ];

        const result = await containers.aggregate(pipeline).toArray();
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});


// ---------------- START SERVER ----------------

const PORT = process.env.PORT || 82;

// Start Express server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});