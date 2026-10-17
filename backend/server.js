require('dotenv').config();   // .env dosyasini process.env'e yukle (EN USTTE olmali)

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');       // sifre hash karsilastirma
const jwt = require('jsonwebtoken');      // token uretme/dogrulama
const nodemailer = require('nodemailer'); // e-posta gonderme
const db = require('./db');               // SQLite veritabani (db.js)

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// --- E-posta gonderici (Gmail SMTP) ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

// --- Auth middleware (bekci): token'i dogrula ---
function authGuard(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token gerekli' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Gecersiz veya suresi dolmus token' });
  }
}

// Projeleri dondur (DB'den oku)
app.get('/api/projects', (req, res) => {
  const rows = db.prepare('SELECT id, title, description, tech FROM projects').all();
  // DB satirlarini frontend'in bekledigi sekle cevir
  const projects = rows.map((r) => ({
    id: r.id,
    title: r.title,
    desc: r.description,          // DB'de 'description', API'de 'desc'
    tech: JSON.parse(r.tech),     // JSON metnini diziye cevir
  }));
  res.json(projects);
});

// Icerigi dondur (DB'den oku)
app.get('/api/content', (req, res) => {
  const content = db.prepare('SELECT name, title, about FROM content WHERE id = 1').get();
  res.json(content);
});

// Icerigi GUNCELLE (korumali)
app.put('/api/content', authGuard, (req, res) => {
  const { name, title, about } = req.body;
  db.prepare('UPDATE content SET name = ?, title = ?, about = ? WHERE id = 1')
    .run(name, title, about);
  res.json({ ok: true });
});

// Projeleri GUNCELLE (korumali) — hepsini sil + yeniden ekle
app.put('/api/projects', authGuard, (req, res) => {
  const projects = req.body;
  db.exec('DELETE FROM projects');
  const insert = db.prepare('INSERT INTO projects (title, description, tech) VALUES (?, ?, ?)');
  for (const p of projects) {
    insert.run(p.title, p.desc, JSON.stringify(p.tech));
  }
  res.json({ ok: true });
});

// --- Admin girisi ---
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (username !== process.env.ADMIN_USERNAME) {
    return res.status(401).json({ error: 'Kullanici adi veya sifre hatali' });
  }
  const ok = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
  if (!ok) {
    return res.status(401).json({ error: 'Kullanici adi veya sifre hatali' });
  }
  const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '2h' });
  res.json({ token });
});

// --- Iletisim: mesaji al + e-posta gonder ---
const messages = [];

app.post('/api/contact', async (req, res) => {
  const { name, message } = req.body;
  messages.push({ name, message });
  console.log('Yeni mesaj:', name, message);

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      subject: `Portfolyo - Yeni mesaj: ${name}`,
      text: `Gonderen: ${name}\n\nMesaj:\n${message}`,
    });
    console.log('Mail gonderildi.');
  } catch (err) {
    console.error('Mail gonderilemedi:', err.message);
  }

  res.json({ ok: true });
});

// --- Sunucuyu baslat ---
app.listen(PORT, () => {
  console.log(`API http://localhost:${PORT} uzerinde calisiyor`);
});
