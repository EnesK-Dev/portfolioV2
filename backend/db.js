// Node'un YERLESIK SQLite modulu (v22+). Kurulum gerekmez.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

// Kalici veri dizini: prod'da mount edilen volume (DATA_DIR), yoksa proje klasoru (dev).
// portfolio.db + uploads burada tutulur ki redeploy'da UCMASIN. Seed JSON'lari __dirname'de kalir.
const DATA_DIR = process.env.DATA_DIR || __dirname;
fs.mkdirSync(DATA_DIR, { recursive: true });

// Veritabani dosyasini ac (yoksa olusturur)
const db = new DatabaseSync(path.join(DATA_DIR, 'portfolio.db'));

// --- Tablolari olustur (yoksa) ---
db.exec(`
  CREATE TABLE IF NOT EXISTS content (
    id    INTEGER PRIMARY KEY,
    name  TEXT,
    title TEXT,
    about TEXT
  );

  CREATE TABLE IF NOT EXISTS projects (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT,
    description TEXT,
    tech        TEXT
  );

  CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT,
    message    TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS featured_repos (
    github_id   INTEGER PRIMARY KEY,
    name        TEXT,
    description TEXT,
    url         TEXT,
    language    TEXT,
    stars       INTEGER
  );

  CREATE TABLE IF NOT EXISTS wip_projects (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    title    TEXT,
    note     TEXT,
    progress INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS notes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    slug       TEXT UNIQUE,
    title      TEXT,
    category   TEXT,
    type       TEXT,
    data       TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// --- Migration: projects tablosuna 'image' sutunu ekle (yoksa) ---
// PRAGMA table_info = tablonun sutunlarini listeler.
const projCols = db.prepare('PRAGMA table_info(projects)').all();
if (!projCols.some((c) => c.name === 'image')) {
  db.exec('ALTER TABLE projects ADD COLUMN image TEXT');
  console.log('projects tablosuna image sutunu eklendi');
}

// --- Migration: content tablosuna 'github' + 'linkedin' sutunlari (yoksa) ---
const contentCols = db.prepare('PRAGMA table_info(content)').all();
if (!contentCols.some((c) => c.name === 'github')) {
  db.exec('ALTER TABLE content ADD COLUMN github TEXT');
  console.log('content tablosuna github sutunu eklendi');
}
if (!contentCols.some((c) => c.name === 'linkedin')) {
  db.exec('ALTER TABLE content ADD COLUMN linkedin TEXT');
  console.log('content tablosuna linkedin sutunu eklendi');
}

// --- Ilk calismada JSON'dan tohumla (migrate) ---

// content tablosu bossa content.json'dan al (dosya yoksa atla -> cokme yok)
const contentCount = db.prepare('SELECT COUNT(*) AS n FROM content').get().n;
const contentSeedPath = path.join(__dirname, 'content.json');
if (contentCount === 0 && fs.existsSync(contentSeedPath)) {
  const c = JSON.parse(fs.readFileSync(contentSeedPath, 'utf-8'));
  db.prepare('INSERT INTO content (id, name, title, about, github, linkedin) VALUES (1, ?, ?, ?, ?, ?)')
    .run(c.name, c.title, c.about, c.github ?? null, c.linkedin ?? null);
  console.log('content tablosu JSON\'dan tohumlandi');
}

// projects tablosu bossa projects.json'dan al (dosya yoksa atla)
const projCount = db.prepare('SELECT COUNT(*) AS n FROM projects').get().n;
const projSeedPath = path.join(__dirname, 'projects.json');
if (projCount === 0 && fs.existsSync(projSeedPath)) {
  const projects = JSON.parse(fs.readFileSync(projSeedPath, 'utf-8'));
  const insert = db.prepare('INSERT INTO projects (title, description, tech) VALUES (?, ?, ?)');
  for (const p of projects) {
    insert.run(p.title, p.desc, JSON.stringify(p.tech));  // tech dizisini JSON metni olarak sakla
  }
  console.log('projects tablosu JSON\'dan tohumlandi');
}

// --- Notlari tohumla/senkronla ---
// Seed notlari notes-seed.json'un AYNASIDIR: yoksa ekle, varsa guncelle (dosyadaki surumu yansit).
// Kalici/elle duzenleme icin admin'den YENI slug ile not olustur; seed slug'lari restart'ta senkronlanir.
const seedNotes = JSON.parse(fs.readFileSync(path.join(__dirname, 'notes-seed.json'), 'utf-8'));
const insertNote = db.prepare('INSERT INTO notes (slug, title, category, type, data) VALUES (?, ?, ?, ?, ?)');
const updateNote = db.prepare('UPDATE notes SET title = ?, category = ?, type = ?, data = ? WHERE slug = ?');
for (const n of seedNotes) {
  const T = JSON.stringify(n.title);
  const C = JSON.stringify(n.category ?? null);
  const D = JSON.stringify(n.data);
  const exists = db.prepare('SELECT 1 FROM notes WHERE slug = ?').get(n.slug);
  if (exists) {
    updateNote.run(T, C, n.type, D, n.slug);
  } else {
    insertNote.run(n.slug, T, C, n.type, D);
    console.log('not eklendi:', n.slug);
  }
}

module.exports = db;
