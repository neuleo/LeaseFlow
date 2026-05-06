const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;
const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'database.sqlite');

app.use(cors());
app.use(bodyParser.json());

// Ensure directory exists
const fs = require('fs');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to SQLite database.');
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )`);
            db.run(`CREATE TABLE IF NOT EXISTS mileage_logs (
                date TEXT PRIMARY KEY,
                km INTEGER
            )`);
        });
    }
});

// Settings Endpoints
app.get('/api/settings', (req, res) => {
    db.all('SELECT * FROM settings', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const settings = {};
        rows.forEach(row => settings[row.key] = row.value);
        res.json(settings);
    });
});

app.post('/api/settings', (req, res) => {
    const { settings } = req.body;
    console.log('Updating settings:', settings);
    
    if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: 'Invalid settings object' });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
        
        try {
            for (const [key, value] of Object.entries(settings)) {
                stmt.run(key, String(value));
            }
            stmt.finalize();
            db.run('COMMIT', (err) => {
                if (err) {
                    console.error('Commit error:', err);
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: 'Settings updated successfully' });
            });
        } catch (err) {
            console.error('Update error:', err);
            db.run('ROLLBACK');
            res.status(500).json({ error: err.message });
        }
    });
});

// Mileage Logs Endpoints
app.get('/api/mileage', (req, res) => {
    db.all('SELECT * FROM mileage_logs ORDER BY date ASC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/mileage', (req, res) => {
    const { date, km } = req.body;
    db.run('INSERT OR REPLACE INTO mileage_logs (date, km) VALUES (?, ?)', [date, km], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Mileage log updated successfully' });
    });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
});
