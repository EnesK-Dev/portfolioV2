// Node'un YERLESIK SQLite modulu (v22+). Kurulum gerekmez.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

// Veritabani dosyasini ac (yoksa olusturur)
const db = new DatabaseSync(path.join(__dirname, 'portfolio.db'));

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

// content tablosu bossa content.json'dan al
const contentCount = db.prepare('SELECT COUNT(*) AS n FROM content').get().n;
if (contentCount === 0) {
  const c = JSON.parse(fs.readFileSync(path.join(__dirname, 'content.json'), 'utf-8'));
  db.prepare('INSERT INTO content (id, name, title, about) VALUES (1, ?, ?, ?)')
    .run(c.name, c.title, c.about);
  console.log('content tablosu JSON\'dan tohumlandi');
}

// projects tablosu bossa projects.json'dan al
const projCount = db.prepare('SELECT COUNT(*) AS n FROM projects').get().n;
if (projCount === 0) {
  const projects = JSON.parse(fs.readFileSync(path.join(__dirname, 'projects.json'), 'utf-8'));
  const insert = db.prepare('INSERT INTO projects (title, description, tech) VALUES (?, ?, ?)');
  for (const p of projects) {
    insert.run(p.title, p.desc, JSON.stringify(p.tech));  // tech dizisini JSON metni olarak sakla
  }
  console.log('projects tablosu JSON\'dan tohumlandi');
}

module.exports = db;
