require('dotenv').config();   // .env dosyasini process.env'e yukle (EN USTTE olmali)

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');       // sifre hash karsilastirma
const jwt = require('jsonwebtoken');      // token uretme/dogrulama
const nodemailer = require('nodemailer'); // e-posta gonderme
const multer = require('multer');         // dosya yukleme
const path = require('path');             // dosya yolu islemleri
const fs = require('fs');                 // klasor olusturma
const db = require('./db');               // SQLite veritabani (db.js)

const app = express();
const PORT = 3001;

// GitHub kullanici adi (.env'de yoksa buradaki varsayilan kullanilir)
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'EnesK-Dev';

app.use(cors());
app.use(express.json());

// --- Dosya yukleme (multer) ---
// Yuklenen dosyalarin saklanacagi klasor; yoksa olustur
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Klasoru statik sun -> tarayici http://localhost:3001/uploads/dosya.png ile erisir
app.use('/uploads', express.static(uploadDir));

// multer: dosyayi nereye, hangi adla kaydedecek?
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    // Kullanicinin verdigi adi KULLANMA (path traversal riski).
    // Kendi rastgele adimizi uret + orijinal uzantiyi koru.
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },   // 2 MB sinir (DoS'a karsi)
  fileFilter: (req, file, cb) => {
    // Sadece resim kabul et (zararli dosya yuklemesine karsi)
    const ok = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.mimetype);
    cb(ok ? null : new Error('Sadece resim yuklenebilir'), ok);
  },
});

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
  const rows = db.prepare('SELECT id, title, description, tech, image FROM projects').all();
  // DB satirlarini frontend'in bekledigi sekle cevir
  const projects = rows.map((r) => ({
    id: r.id,
    title: r.title,
    desc: r.description,          // DB'de 'description', API'de 'desc'
    tech: JSON.parse(r.tech),     // JSON metnini diziye cevir
    image: r.image,               // yuklenen gorselin yolu (olabilir null)
  }));
  res.json(projects);
});

// Icerigi dondur (DB'den oku)
app.get('/api/content', (req, res) => {
  const content = db.prepare('SELECT name, title, about, github, linkedin FROM content WHERE id = 1').get();
  res.json(content);
});

// Icerigi GUNCELLE (korumali)
app.put('/api/content', authGuard, (req, res) => {
  const { name, title, about, github, linkedin } = req.body;
  db.prepare('UPDATE content SET name = ?, title = ?, about = ?, github = ?, linkedin = ? WHERE id = 1')
    .run(name, title, about, github || null, linkedin || null);
  res.json({ ok: true });
});

// Projeleri GUNCELLE (korumali) — hepsini sil + yeniden ekle
app.put('/api/projects', authGuard, (req, res) => {
  const projects = req.body;
  db.exec('DELETE FROM projects');
  const insert = db.prepare('INSERT INTO projects (title, description, tech, image) VALUES (?, ?, ?, ?)');
  for (const p of projects) {
    insert.run(p.title, p.desc, JSON.stringify(p.tech), p.image || null);
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

// --- Iletisim: mesaji DB'ye kaydet + e-posta gonder ---
app.post('/api/contact', async (req, res) => {
  const { name, message } = req.body;

  // 1) Mesaji veritabanina yaz (kalici) — created_at otomatik dolar
  db.prepare('INSERT INTO messages (name, message) VALUES (?, ?)')
    .run(name, message);
  console.log('Yeni mesaj DB\'ye kaydedildi:', name);

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

// --- Mesajlari listele (korumali) — en yeni ustte ---
app.get('/api/messages', authGuard, (req, res) => {
  const rows = db.prepare(
    'SELECT id, name, message, created_at FROM messages ORDER BY id DESC'
  ).all();
  res.json(rows);
});

// --- GitHub repolarini cek (public) ---
app.get('/api/github/repos', async (req, res) => {
  try {
    const url = `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=100`;

    // Token varsa Authorization basligi ekle (limit 60 -> 5000/saat)
    const headers = {
      'User-Agent': 'portfolio-app',          // GitHub zorunlu tutar
      Accept: 'application/vnd.github+json',
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const ghRes = await fetch(url, { headers });
    if (!ghRes.ok) throw new Error('GitHub API durumu: ' + ghRes.status);

    const data = await ghRes.json();
    // Sadece ihtiyacimiz olan alanlari al; fork'lari ele
    const repos = data
      .filter((r) => !r.fork)
      .map((r) => ({
        id: r.id,
        name: r.name,
        desc: r.description,
        url: r.html_url,
        language: r.language,
        stars: r.stargazers_count,
      }));

    res.json(repos);
  } catch (err) {
    console.error('GitHub cekilemedi:', err.message);
    res.status(502).json({ error: 'GitHub repolari alinamadi' });
  }
});

// --- Yayinlanan (secili) repolari dondur (public) ---
app.get('/api/github/featured', (req, res) => {
  const rows = db.prepare(
    'SELECT github_id, name, description, url, language, stars FROM featured_repos'
  ).all();
  // Frontend'e tutarli isimlerle ver (description -> desc)
  const repos = rows.map((r) => ({
    id: r.github_id,
    name: r.name,
    desc: r.description,
    url: r.url,
    language: r.language,
    stars: r.stars,
  }));
  res.json(repos);
});

// --- Secili repolari KAYDET (korumali) — hepsini sil + yeniden ekle ---
app.put('/api/github/featured', authGuard, (req, res) => {
  const repos = req.body;   // frontend'in gonderdigi secili repo dizisi
  db.exec('DELETE FROM featured_repos');
  const insert = db.prepare(
    'INSERT INTO featured_repos (github_id, name, description, url, language, stars) VALUES (?, ?, ?, ?, ?, ?)'
  );
  for (const r of repos) {
    insert.run(r.id, r.name, r.desc, r.url, r.language, r.stars);
  }
  res.json({ ok: true });
});

// --- Devam eden projeler (public) ---
app.get('/api/wip', (req, res) => {
  const rows = db.prepare('SELECT id, title, note, progress FROM wip_projects').all();
  res.json(rows);
});

// --- Devam eden projeleri KAYDET (korumali) — hepsini sil + yeniden ekle ---
app.put('/api/wip', authGuard, (req, res) => {
  const items = req.body;
  db.exec('DELETE FROM wip_projects');
  const insert = db.prepare('INSERT INTO wip_projects (title, note, progress) VALUES (?, ?, ?)');
  for (const w of items) {
    // progress'i 0-100 arasina sabitle (guvenlik/temizlik)
    const p = Math.max(0, Math.min(100, Number(w.progress) || 0));
    insert.run(w.title, w.note || null, p);
  }
  res.json({ ok: true });
});

// --- Resim yukle (korumali) ---
app.post('/api/upload', authGuard, (req, res) => {
  // upload.single('image') tek dosyayi 'image' alanindan alir.
  // Hata (yanlis tip / cok buyuk) yakalayabilmek icin elle cagiriyoruz.
  const handler = upload.single('image');
  handler(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Dosya bulunamadi' });
    // Frontend'e dosyanin erisim yolunu don
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

// --- Sunucuyu baslat ---
app.listen(PORT, () => {
  console.log(`API http://localhost:${PORT} uzerinde calisiyor`);
});
