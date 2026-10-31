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
const PORT = process.env.PORT || 3001;   // Railway/host PORT verir; yoksa dev'de 3001
// Tek proxy (nginx/host) arkasindayken req.ip gercek istemci IP'si olsun (rate limit dogru calissin)
app.set('trust proxy', 1);

// GitHub kullanici adi (.env'de yoksa buradaki varsayilan kullanilir)
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'EnesK-Dev';

// CORS: prod'da sadece izin verilen origin(ler)e ac (virgulle birden fazla),
// CORS_ORIGIN tanimli degilse (dev) eski davranis = tum originlere izin.
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors(allowedOrigins.length ? { origin: allowedOrigins } : {}));
app.use(express.json());

// --- Dosya yukleme (multer) ---
// Yuklenen dosyalarin saklanacagi klasor; yoksa olustur
const uploadDir = path.join(process.env.DATA_DIR || __dirname, 'uploads');
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

// --- Basit bellek-ici rate limit (ek bagimlilik yok) ---
// IP basina windowMs suresinde en fazla 'max' istek; asilirsa 429 doner.
// Not: tek sunucu ornegi icin yeterli; restart'ta sayac sifirlanir (portfolyo olceginde sorun degil).
// Uretimde cok ornekli/siddetli ihtiyac olursa 'express-rate-limit' + Redis'e gecilir.
function rateLimit({ windowMs, max, message }) {
  const hits = new Map(); // ip -> { count, resetAt }
  // Suresi dolan kayitlari periyodik temizle (Map sonsuz buyumesin). unref: sureci acik tutmasin.
  setInterval(() => {
    const now = Date.now();
    for (const [ip, e] of hits) if (now > e.resetAt) hits.delete(ip);
  }, windowMs).unref();

  return (req, res, next) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    let e = hits.get(ip);
    if (!e || now > e.resetAt) { e = { count: 0, resetAt: now + windowMs }; hits.set(ip, e); }
    e.count++;
    if (e.count > max) {
      const retryAfter = Math.ceil((e.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: message, retryAfter });
    }
    next();
  };
}

// Admin girisi: brute-force'a karsi 15 dakikada 5 deneme
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5,
  message: 'Cok fazla giris denemesi. 15 dakika sonra tekrar deneyin.',
});
// Iletisim: spam'e karsi saatte 5 mesaj
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 5,
  message: 'Cok fazla mesaj gonderildi. Lutfen daha sonra tekrar deneyin.',
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
app.post('/api/login', loginLimiter, async (req, res) => {
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
app.post('/api/contact', contactLimiter, async (req, res) => {
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

// JSON ise parse et, degilse (eski duz metin) oldugu gibi birak -> geriye uyumlu
function parseMaybe(v) {
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return v; }
}

// --- Notlar: liste (public) --- data'yi gondermeyiz (liste hafif olsun)
app.get('/api/notes', (req, res) => {
  const rows = db.prepare('SELECT slug, title, category, type, created_at FROM notes ORDER BY id DESC').all();
  res.json(rows.map((r) => ({ ...r, title: parseMaybe(r.title), category: parseMaybe(r.category) })));
});

// --- Notlar: tek not (public) --- :slug URL parametresi
app.get('/api/notes/:slug', (req, res) => {
  const row = db.prepare('SELECT slug, title, category, type, data, created_at FROM notes WHERE slug = ?').get(req.params.slug);
  if (!row) return res.status(404).json({ error: 'Not bulunamadi' });
  res.json({
    ...row,
    title: parseMaybe(row.title),
    category: parseMaybe(row.category),
    data: parseMaybe(row.data),
  });
});

// --- Not olustur (korumali) ---
app.post('/api/notes', authGuard, (req, res) => {
  const { slug, title, category, type, data } = req.body;
  if (!slug || !title) return res.status(400).json({ error: 'slug ve title gerekli' });
  try {
    db.prepare('INSERT INTO notes (slug, title, category, type, data) VALUES (?, ?, ?, ?, ?)')
      .run(slug, JSON.stringify(title ?? ''), JSON.stringify(category ?? null), type || 'ports', JSON.stringify(data ?? []));
    res.json({ ok: true });
  } catch {
    // slug UNIQUE -> ayni slug varsa buraya duser
    res.status(409).json({ error: 'Bu slug zaten kullaniliyor' });
  }
});

// --- Not guncelle (korumali) ---
app.put('/api/notes/:slug', authGuard, (req, res) => {
  const { title, category, type, data } = req.body;
  const info = db.prepare('UPDATE notes SET title=?, category=?, type=?, data=? WHERE slug=?')
    .run(JSON.stringify(title ?? ''), JSON.stringify(category ?? null), type || 'ports', JSON.stringify(data ?? []), req.params.slug);
  if (info.changes === 0) return res.status(404).json({ error: 'Not bulunamadi' });
  res.json({ ok: true });
});

// --- Not sil (korumali) ---
app.delete('/api/notes/:slug', authGuard, (req, res) => {
  db.prepare('DELETE FROM notes WHERE slug = ?').run(req.params.slug);
  res.json({ ok: true });
});

// --- Sunucuyu baslat ---
app.listen(PORT, () => {
  console.log(`API http://localhost:${PORT} uzerinde calisiyor`);
});
