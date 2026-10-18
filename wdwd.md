# 📘 Portfolio — Öğrenme Günlüğü & Başvuru Belgesi (wdwd.md)

Bu dosya projenin **tam referansı**: ne yaptık, nasıl yaptık, **neden** öyle yaptık.
Amaç — kodun arkasında durabilmen; her detayı burada, yerli yerinde bulabilmen.

> **Nasıl okunur:** Önce Bölüm 1–3 (genel bakış, çalıştırma, mimari) — bütünü oturtur.
> Sonra Bölüm 4 (özellikler, katman katman — her biri kendi içinde tam).
> En sonda Bölüm 5 (başvuru tabloları: API, DB şeması, güvenlik, frontend haritası, kavram sözlüğü, hata günlüğü) — "şu neredeydi?" diye bakarsın.

---

# 1. Genel Bakış

**Ne yapıyoruz:** Kendi içeriğini bir **admin panelinden** yönetebildiğin, full-stack bir portfolyo sitesi.

**Teknoloji yığını:**
- **Frontend:** React (Vite ile), react-router-dom. Tarayıcıda çalışır, port **5173**.
- **Backend:** Node.js + Express. API sunar, port **3001**.
- **Veritabanı:** SQLite (`node:sqlite`, Node yerleşik). Tek dosya: `backend/portfolio.db`.
- **Ek servisler:** Nodemailer (Gmail SMTP), GitHub REST API, multer (dosya yükleme).

**Temel kavramlar:**
- **Frontend** = kullanıcının gördüğü/etkileştiği taraf (arayüz).
- **Backend** = arka plandaki sunucu; veriyi, mantığı, veritabanını yönetir.
- **API** = frontend ile backend'in konuştuğu "menü". Frontend "şu veriyi ver" der (HTTP isteği), backend cevap döner (genelde **JSON**).
- **localhost** = kendi bilgisayarın. **port** = o bilgisayardaki bir kapı numarası. `localhost:5173` = kendi makinendeki 5173 kapısı.

**Proje yapısı (güncel):**
```
~/Desktop/Portfolio/
├── frontend/
│   └── src/
│       ├── main.jsx                 → giriş noktası; <App/>'i <BrowserRouter> ile sarar
│       ├── App.jsx                  → router (hangi URL → hangi sayfa)
│       ├── App.css / index.css      → stiller
│       ├── pages/
│       │   ├── Home.jsx             → public site (herkese açık ana sayfa)
│       │   └── Admin.jsx            → yönetim paneli (login + düzenleme)
│       └── components/
│           ├── ProjectsEditor.jsx   → projeleri düzenle (kapak görselli)
│           ├── MessagesList.jsx     → gelen iletişim mesajlarını listele
│           ├── GithubRepos.jsx      → GitHub repolarını listele + yayınlanacakları seç
│           └── ProgressEditor.jsx   → "devam eden projeler" + ilerleme çubuğu
├── backend/
│   ├── server.js                    → tüm API (Express)
│   ├── db.js                        → SQLite kurulum, tablolar, migration, tohumlama
│   ├── portfolio.db                 → canlı veritabanı (git'e gitmez)
│   ├── content.json / projects.json → yalnızca İLK tohum verisi
│   ├── uploads/                     → yüklenen görseller (git'e gitmez)
│   └── .env                         → secret'lar (git'e gitmez)
└── wdwd.md                          → bu dosya
```

---

# 2. Projeyi Çalıştırma

**İki sunucu, iki terminal** (ikisi aynı anda açık olmalı):
```bash
# Terminal 1 — backend
cd ~/Desktop/Portfolio/backend && node server.js
# -> "API http://localhost:3001 uzerinde calisiyor"

# Terminal 2 — frontend
cd ~/Desktop/Portfolio/frontend && npm run dev
# -> http://localhost:5173
```
Sonra tarayıcıda `http://localhost:5173` (public), `http://localhost:5173/admin` (panel).

**Kurallar / sık karşılaşılanlar:**
- ⚠️ **Node hot-reload yapmaz.** `server.js` veya `db.js` değişince backend'i **Ctrl+C** + `node server.js` ile yeniden başlat. (Frontend/Vite ise kendini otomatik yeniler.)
- **`EADDRINUSE :::3001`** = port 3001 zaten dolu (eski bir node düzgün kapanmamış). Çöz:
  ```bash
  kill $(lsof -t -i:3001)
  ```
- **Gerekli `.env` değişkenleri** (hepsi `backend/.env`, hepsi gizli):
  ```
  ADMIN_USERNAME=enes
  ADMIN_PASSWORD_HASH=<bcrypt hash>
  JWT_SECRET=<rastgele uzun string>
  EMAIL_USER=<gmail adresi>
  EMAIL_APP_PASSWORD=<16 haneli gmail app password>
  EMAIL_TO=<mailin gideceği adres>
  GITHUB_TOKEN=ghp_...        # opsiyonel ama önerilir (rate limit)
  GITHUB_USERNAME=EnesK-Dev   # opsiyonel (yoksa kodda varsayılan)
  ```

---

# 3. Mimari & Veri Akışı (büyük resim)

Bu bölümü anlarsan gerisi detaydır.

## 3.1 — Üç katman ve değişmez kural
```
   TARAYICI                    SUNUCU                  DOSYA
┌─────────────┐  fetch   ┌───────────────┐  SQL   ┌──────────────┐
│  Frontend   │ ───────► │   Backend     │ ─────► │ portfolio.db │ ◄── canlı veri
│ (React/5173)│ ◄─────── │ (Express/3001)│ ◄───── │   (SQLite)   │
└─────────────┘  JSON    └───────────────┘  satır └──────────────┘
                                                         ▲
                                                         │ sadece İLK kurulumda
                                                   ┌─────┴──────┐
                                                   │  *.json    │ ◄── tohum (bir kez)
                                                   └────────────┘
```
**Üç temel kural:**
1. **Frontend veriyi hep API'den çeker** (`fetch` → backend), asla dosyadan/DB'den doğrudan değil.
2. **Backend tek yetkili** — DB'ye okuyan/yazan yalnızca o. (Frontend tarayıcıda çalışır; DB'ye doğrudan erişseydi herkes her şeyi değiştirebilirdi → güvenlik.)
3. **JSON = fabrika ayarı, DB = canlı veri.** Editleme hep DB'de.

## 3.2 — Veri modelinin evrimi (nereden nereye)
Proje boyunca veri 3 aşamadan geçti — bilmen önemli, çünkü kodda ikisinin de izi var:
```
1) Kodda sabit dizi   →  2) JSON dosyası       →  3) SQLite (şu an)
   (server.js içinde)     (content/projects.json)   (portfolio.db)
```
- **Neden kod yetmedi?** Çalışan program kendi `.js` kaynağını yazamaz; panelden kaydettiğin veri bir yere **yazılabilmeli**.
- **Neden JSON yetmedi?** Tek kayıt bulmak, aynı anda yazmak, listeler büyüyünce yönetmek zor. SQL bunları hallediyor.
- **JSON dosyalarının bugünkü tek görevi:** DB **ilk kez** oluşurken tabloları **bir kerelik tohumlamak** (seed). O iş bitince sistem JSON'a ne bakar ne yazar.

**`db.js` ne zaman çalışır?** `portfolio.db` yalnızca `node server.js` ilk kez `db.js`'i yükleyince oluşur (`backend/portfolio.db`). İçinde tablolar kurulur; tablo boşsa JSON'dan tohumlanır.

**Deney (öğretici):** `backend/portfolio.db`'yi silip (`rm portfolio.db`) backend'i yeniden başlatırsan → DB sıfırdan oluşur → JSON'lardan tekrar tohumlanır → panelden yaptığın değişiklikler gider (onlar DB'deydi). `.db` zaten `.gitignore`'da, silmek güvenli.
> **Not:** `portfolio.db` **ikili (binary)** dosya — metin editörüyle açma. İçine bakmak için `sqlite3` komutu ya da kod üzerinden `SELECT`.

## 3.3 — OKUMA akışı (site açıldığında)
```
1. Home.jsx açılır → fetch('http://localhost:3001/api/content')
2. server.js → app.get('/api/content') → db.prepare('SELECT ... WHERE id=1').get()
3. SQLite veriyi döndürür
4. Backend res.json(content) → frontend
5. Frontend ekrana basar
```

## 3.4 — YAZMA akışı (admin'den "Kaydet")
```
1. Admin.jsx → fetch(PUT, headers:{Authorization:'Bearer <token>'}, body: JSON)
2. server.js → app.put('/api/content', authGuard, ...)
     └ authGuard: token geçerli mi? değilse 401 DUR, geçerliyse next()
3. db.prepare('UPDATE content SET ... WHERE id=1').run(...)  → DB güncellendi
4. res.json({ ok:true }) → frontend "tamam"
```

## 3.5 — Routing (react-router-dom)
React tek sayfadır; farklı "sayfalar" için router kullanılır.
- `main.jsx`: `<App/>`'i `<BrowserRouter>` ile sarar (URL'yi dinler).
- `App.jsx`:
  ```jsx
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/admin" element={<Admin />} />
  </Routes>
  ```
- Mantık: URL `/admin` olunca React `<Admin/>`'i gösterir, sayfa yenilemeden.

---

# 4. Özellikler — Katman Katman

Her alt bölüm kendi içinde tamdır: backend + DB + frontend + varsa güvenlik.

## 4.1 — İçerik (isim / başlık / hakkımda / sosyal linkler)

**Ne:** Ana sayfadaki metinler + GitHub/LinkedIn linkleri, panelden düzenlenir.

**DB:** `content` tablosu, **tek satır** (`id=1`): `name, title, about, github, linkedin`.

**Backend:**
```js
app.get('/api/content', (req, res) => {
  const content = db.prepare('SELECT name, title, about, github, linkedin FROM content WHERE id = 1').get();
  res.json(content);
});
app.put('/api/content', authGuard, (req, res) => {       // korumalı
  const { name, title, about, github, linkedin } = req.body;
  db.prepare('UPDATE content SET name=?, title=?, about=?, github=?, linkedin=? WHERE id=1')
    .run(name, title, about, github || null, linkedin || null);
  res.json({ ok: true });
});
```

**Frontend (`Admin.jsx`):** controlled input'lar (name/title/about/github/linkedin). Giriş yapılınca `useEffect(..., [token])` ile mevcut içerik çekilip forma yüklenir. Kaydet → `PUT /api/content` (token'lı). Link input'ları `value={content.github || ''}` (DB null gelirse input bozulmasın).

**Frontend (`Home.jsx`):** `<h1>{content?.name}</h1>`, `{content?.about && ...}`, header'da `{content?.github && <a target="_blank" rel="noreferrer">GitHub</a>}` (sadece doluysa gösterilir).

**Geçmiş (neden böyle):** İçerik önce `server.js`'te sabitti → sonra `content.json`'a taşındı (yazılabilir olsun) → sonunda SQLite'a. GitHub/LinkedIn sütunları sonradan **migration** ile eklendi (bkz. 5.2 DB şeması / migration mantığı).

## 4.2 — Projeler (manuel, kapak görselli)

**Ne:** Elle girdiğin projeler; başlık, açıklama, teknoloji etiketleri, kapak görseli.

**DB:** `projects` tablosu: `id (AUTOINCREMENT), title, description, tech, image`.
- **`tech`** SQL'de dizi tutamaz → `JSON.stringify` ile **metin** saklanır, okunurken `JSON.parse`.
- **`desc` → `description`:** `desc` SQL'de ayrılmış kelime (sıralama); sütun adı `description`, API'de `desc` olarak eşlenir (`r.description → desc`).
- **`image`** sonradan migration ile eklendi; görselin yolu (`/uploads/..`) ya da null.

**Backend:**
```js
app.get('/api/projects', (req, res) => {
  const rows = db.prepare('SELECT id, title, description, tech, image FROM projects').all();
  res.json(rows.map(r => ({ id:r.id, title:r.title, desc:r.description, tech:JSON.parse(r.tech), image:r.image })));
});
app.put('/api/projects', authGuard, (req, res) => {       // korumalı; hepsini sil + yeniden ekle
  db.exec('DELETE FROM projects');
  const insert = db.prepare('INSERT INTO projects (title, description, tech, image) VALUES (?, ?, ?, ?)');
  for (const p of req.body) insert.run(p.title, p.desc, JSON.stringify(p.tech), p.image || null);
  res.json({ ok: true });
});
```
> **"Hepsini sil + yeniden ekle" deseni:** Tüm listeyi tek seferde kaydetmenin basit yolu. Küçük listelerde sorun değil; büyüse tek tek UPDATE/DELETE'e geçilir.

**Frontend (`ProjectsEditor.jsx`):** dizi-CRUD, hep **immutable**:
```jsx
prev.map((p,i) => i===index ? {...p,[key]:value} : p)   // güncelle
prev.filter((_,i) => i!==index)                          // sil
[...prev, { id:newId, title:'', desc:'', tech:[] }]      // ekle
```
- **tech:** formda `p.tech.join(', ')` ile virgüllü metin; kaydederken `value.split(',').map(t=>t.trim()).filter(Boolean)` ile tekrar dizi.
- **Kapak görseli:** bkz. 4.6 (multer).

**Frontend (`Home.jsx`):** her proje bir kart; `{p.image && <img className="card-img" src={`http://localhost:3001${p.image}`} />}` + başlık + açıklama + tech etiketleri.

## 4.3 — İletişim formu (+ e-posta + DB kaydı)

**Ne:** Ziyaretçi ad + mesaj yazar → mesaj hem **DB'ye kaydedilir** (kalıcı) hem **mailine düşer** → admin panelinde listelenir.

**GET vs POST:** GET = veri İSTEMEK (al). POST = veri GÖNDERMEK (yolla). Form gönderimi POST.

**DB:** `messages` tablosu: `id (AUTOINCREMENT), name, message, created_at TEXT DEFAULT (datetime('now'))`.
- `created_at`'i **biz göndermeyiz**; SQLite otomatik doldurur.

**Backend:**
```js
// mesajı al: DB'ye yaz + mail gönder
app.post('/api/contact', async (req, res) => {
  const { name, message } = req.body;
  db.prepare('INSERT INTO messages (name, message) VALUES (?, ?)').run(name, message); // kalıcı
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER, to: process.env.EMAIL_TO,
      subject: `Portfolyo - Yeni mesaj: ${name}`, text: `Gonderen: ${name}\n\n${message}`,
    });
  } catch (err) { console.error('Mail gonderilemedi:', err.message); }  // mail başarısız olsa da form başarılı döner
  res.json({ ok: true });
});
// mesajları listele (korumalı) — en yeni üstte
app.get('/api/messages', authGuard, (req, res) => {
  res.json(db.prepare('SELECT id, name, message, created_at FROM messages ORDER BY id DESC').all());
});
```
**E-posta (Nodemailer):**
```js
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD },
});
```
- **SMTP** = e-posta gönderme protokolü. **App Password** = Gmail'in dış uygulamalara verdiği 16 haneli özel şifre (2FA şart; normal şifre kullanılmaz).
- **try/catch mantığı:** mail "olursa iyi"; başarısız olsa bile form akışını bozmamalı.

**Frontend (`Home.jsx`):** controlled input'lar (name/message), `onSubmit` + `e.preventDefault()` (form sayfa yenilemesini durdur), `fetch` POST ile JSON gövde. Başarılıysa alanları temizle + "Gönderildi!".

**Frontend (`MessagesList.jsx`):** `token` prop'u + açılışta `GET /api/messages` (Bearer token) → `messages.map(...)` kart kart. `res.ok` değilse hata.

**Mimari ders:** `GET /api/content` **public** (herkes okur), `GET /api/messages` **korumalı**. Aynı DB, farklı **yetki** → "bu veriyi kim görmeli?" sorusuna göre `authGuard` eklenir.

## 4.4 — Admin paneli & kimlik doğrulama (auth) 🔐

Projenin güvenlik kalbi. **Problem:** Paneli sadece sen kullanabilmelisin; ama HTTP **stateless** (her istek bağımsız, sunucu seni hatırlamaz) — her istekte "zaten giriş yaptım"ı nasıl kanıtlarsın?

**1) Şifre düz saklanmaz → bcrypt hash (`.env`'de)**
```bash
node -e "console.log(require('bcryptjs').hashSync('sifren', 10))"   # $2b$10$... üretir
```
- bcrypt = tek yönlü + salt'lı + kasıtlı yavaş hash. `10` = cost (yüksek = kırması zor).
- **Engellenen saldırı:** `.env`/DB sızsa bile hash'ten şifre çıkmaz; yavaşlık + salt **brute-force** ve **rainbow table**'ı etkisiz kılar.

**2) Login (`POST /api/login`)**
```js
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (username !== process.env.ADMIN_USERNAME)
    return res.status(401).json({ error: 'Kullanici adi veya sifre hatali' });
  const ok = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
  if (!ok) return res.status(401).json({ error: 'Kullanici adi veya sifre hatali' });
  const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '2h' });
  res.json({ token });
});
```
- `bcrypt.compare(girilen, hash)` → girilen şifre aynı salt'la hash'lenip karşılaştırılır (hash çözülmez) → true/false.
- **Aynı hata mesajı** (yanlış kullanıcı adında da şifrede de) → **user enumeration** engeli (hangi username'in var olduğu belli olmaz).
- `jwt.sign(payload, secret, {expiresIn})` → **imzalı token**: içinde "bu enes, 2 saat geçerli".

**3) JWT nedir:** `header.payload.signature` yapısında metin. İmza (JWT_SECRET ile) gerçekliği kanıtlar — secret'ı bilmeden token **üretilemez/değiştirilemez** (tampering engeli). İstemci saklar, sonraki isteklerde gönderir; sunucu imzayı doğrular. **Stateless** (sunucu oturum tutmaz). `expiresIn:'2h'` → çalınsa bile 2 saatte ölür.

**4) authGuard (middleware / bekçi)**
```js
function authGuard(req, res, next) {
  const token = (req.headers.authorization || '').split(' ')[1];  // "Bearer <token>"
  if (!token) return res.status(401).json({ error: 'Token gerekli' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }  // imza+süre OK → devam
  catch { return res.status(401).json({ error: 'Gecersiz veya suresi dolmus token' }); }
}
```
- **Middleware** = endpoint'ten **önce** çalışan `(req,res,next)` fonksiyonu. Ya `next()` (geç) ya cevap döner (engelle).
- `app.put('/yol', authGuard, handler)` → sadece bu route korunur.
- **Engellenen saldırı: Broken Access Control (OWASP #1)** — biri `curl` ile direkt PUT atsa token olmadan 401 yer.
- **Authentication vs Authorization:** login = *kimsin* (authn). guard = *yetkin var mı* (authz).

**5) Frontend (`Admin.jsx`)**
```jsx
const [token, setToken] = useState(() => localStorage.getItem('token') || '')  // lazy initial state
// login başarılıysa: localStorage.setItem('token', data.token); setToken(data.token)
if (!token) return <LoginFormu/>   // koşullu render
return <Panel/>
```
- **localStorage** → tarayıcı deposu; sayfa yenilense de kalır → token'ı burada tutarız, giriş düşmez. (`setItem/getItem/removeItem`.)
- **Çıkış:** `localStorage.removeItem('token')` + `setToken('')`.
- ⚠️ **Dürüst zayıflık:** JWT'yi localStorage'da tutmak **XSS**'e açık; production'da `httpOnly cookie` daha güvenli. (Mülakatta bunu *kendin* söylersen artı.)

**Korumalı tüm uçlar:** `PUT /api/content`, `PUT /api/projects`, `GET /api/messages`, `POST /api/upload`, `PUT /api/github/featured`, `PUT /api/wip`.

## 4.5 — GitHub entegrasyonu

**Ne:** Repolarını GitHub'dan çek, admin'den hangilerini **yayınlayacağını seç**, public site'ta göster.

**Tasarım kararı — neden backend üzerinden?** Frontend doğrudan GitHub'ı çağırsaydı `GITHUB_TOKEN` tarayıcıya sızardı (frontend kodu %100 public). Backend'den gidince **token `.env`'de gizli** kalır. Ayrıca düzen (frontend hep tek yere konuşur) + rate limit/cache yönetimi. → **Frontend → bizim backend → GitHub.**

**(a) Repoları çekme — `GET /api/github/repos` (public):**
```js
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'EnesK-Dev';
app.get('/api/github/repos', async (req, res) => {
  try {
    const headers = { 'User-Agent': 'portfolio-app', Accept: 'application/vnd.github+json' };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const ghRes = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=100`, { headers });
    if (!ghRes.ok) throw new Error('GitHub API durumu: ' + ghRes.status);
    const data = await ghRes.json();
    res.json(data.filter(r => !r.fork).map(r => ({
      id:r.id, name:r.name, desc:r.description, url:r.html_url, language:r.language, stars:r.stargazers_count,
    })));
  } catch (err) { res.status(502).json({ error: 'GitHub repolari alinamadi' }); }
});
```
- **`fetch` backend'de de var** (Node 18+). Backend hem sunucu hem başka API'lere istemci olabilir.
- **`?sort=updated&per_page=100`** = en son güncellenen önde, en çok 100.
- **`User-Agent` zorunlu** (yoksa 403). **`.filter(!fork)`** = forkları ele. **`.map`** = kocaman cevabı 6 alana indir.
- **`res.status(502)` (Bad Gateway)** = bizim sunucu çalıştı ama arkadaki servise (GitHub) ulaşırken sorun oldu — doğru status kodu.

**Rate limit + token (yaşadığımız gerçek olay):** Token'sız GitHub saatte **60 istek** → **403 rate limit** aldık (paylaşımlı IP hızlı doldurur). Çözüm: GitHub **classic token**, **hiç scope işaretlemeden** (sadece okuma, limit 5000/saat). **En az yetki (least privilege):** token ne kadar az yetkili, sızsa o kadar az zarar. `public_repo` bile gereksiz (o yazma yetkisi de verir).

**(b) Yayınlanacakları seçme — snapshot deseni.** **Karar:** seçili repoların bilgisini DB'ye **fotoğraf** olarak kaydet; public site DB'den okur, GitHub'a hiç gitmez → hızlı + GitHub çökse bile site ayakta + rate limit yemez.

**DB:** `featured_repos`: `github_id (PRIMARY KEY — GitHub id zaten benzersiz, aynı repo iki kez eklenmez), name, description, url, language, stars`.
```js
app.get('/api/github/featured', (req, res) => {       // public
  const rows = db.prepare('SELECT github_id, name, description, url, language, stars FROM featured_repos').all();
  res.json(rows.map(r => ({ id:r.github_id, name:r.name, desc:r.description, url:r.url, language:r.language, stars:r.stars })));
});
app.put('/api/github/featured', authGuard, (req, res) => {   // korumalı; DELETE + INSERT
  db.exec('DELETE FROM featured_repos');
  const insert = db.prepare('INSERT INTO featured_repos (github_id, name, description, url, language, stars) VALUES (?, ?, ?, ?, ?, ?)');
  for (const r of req.body) insert.run(r.id, r.name, r.desc, r.url, r.language, r.stars);
  res.json({ ok: true });
});
```

**Frontend (`GithubRepos.jsx`, admin):** açılışta hem `/repos` (tümü) hem `/featured` (önceden seçilenler) çekilir → checkbox'lar önceden işaretli. Seçim:
```jsx
prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]   // toggle (immutable)
checked={selectedIds.includes(r.id)}                          // kontrollü checkbox
repos.filter(r => selectedIds.includes(r.id))                 // kaydederken seçili nesneler → PUT (token'lı)
```

**Frontend (`Home.jsx`):** `GET /api/github/featured` (token yok) → `featured.length>0 &&` → "GitHub Projelerim" bölümü; her repo tıklanabilir kart.

**Ders:** Aynı veri (repolar) iki endpoint, iki amaç: `/repos` = canlı GitHub (admin seçsin), `/featured` = DB snapshot (ziyaretçi görsün). Endpoint tasarımı = "bu veriyi kim, ne zaman, nereden görmeli?"

## 4.6 — Görsel/dosya yükleme (multer) 📷

**Ne:** Projelere kapak görseli. **Yeni kavram:** dosya metinden farklı taşınır.

**Neden `multipart/form-data`?** Şimdiye dek hep **JSON (metin)** yolladık. Resim **ikili (binary)** ve **büyük** → JSON'a tıkıştırılmaz. `multipart/form-data` = "istekte hem metin hem büyük dosya var" diyen özel format. Tarayıcıda **`FormData`**, backend'de **`multer`** middleware'i.

**Dosya nerede durur?** Resmin **kendisi diskte** (`backend/uploads/`), DB'de **sadece yol** (`/uploads/123.png`). DB dosya deposu değil, "etiket" tutar. (`uploads/` → `.gitignore`.) Analoji: kütüphanede kitap (resim) rafta, DB fişi (yol) raf numarasını söyler.

**Backend:**
```js
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));   // tarayıcı /uploads/.. ile erişir

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, Date.now() + '-' + Math.round(Math.random()*1e9) + ext);  // KENDİ rastgele adımız
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2*1024*1024 },               // 2MB
  fileFilter: (req, file, cb) => {
    const ok = ['image/png','image/jpeg','image/webp','image/gif'].includes(file.mimetype);
    cb(ok ? null : new Error('Sadece resim yuklenebilir'), ok);
  },
});
app.post('/api/upload', authGuard, (req, res) => {   // korumalı
  upload.single('image')(req, res, (err) => {        // elle çağırıyoruz ki hata (tip/boyut) yakalanabilsin
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Dosya bulunamadi' });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});
```
- **`express.static`** = bir klasörü olduğu gibi web'de yayınlar.
- **`express.json()` dosyayı çözemez** (o sadece metin bilir) → dosya için ayrı çözücü: `multer`.

**🔒 Güvenlik (upload klasik saldırı yüzeyi):**
- **fileFilter (tip):** sadece resim → `.php/.exe` yükleyip çalıştırma (**malicious upload**) engeli.
- **limits (boyut):** 2MB → dev dosyayla disk doldurma (**DoS**) engeli.
- **Kendi dosya adımız:** kullanıcının adını kullanmayız → `../../etc/passwd` (**path traversal**) engeli.
- **authGuard:** sadece giriş yapan admin yükler.

**Frontend (`ProjectsEditor.jsx`):**
```js
const formData = new FormData();
formData.append('image', file);                    // backend'de upload.single('image') ile eşleşir
fetch('.../api/upload', { method:'POST', headers:{ Authorization:`Bearer ${token}` }, body: formData });
```
- ⚠️ **EN KRİTİK TUZAK:** FormData gönderirken `Content-Type`'ı **ELLE YAZMA.** Tarayıcı multipart "boundary"sini kendi ekler; elle yazarsan boundary eksik kalır, upload bozulur.
- `<input type="file" accept="image/*">` → `onChange` ile `uploadImage(i, file)` → dönen `url`'yi `updateProject(i,'image',url)` ile sakla → `<img>` önizleme.

**Fotoğrafın tam yolculuğu:** admin dosya seçer → FormData POST → authGuard → multer (fileFilter → limits → diske kaydet) → `{url}` döner → frontend projenin `image` alanına yazar → "Projeleri Kaydet" PUT → DB `image` sütununa **yol** yazılır → public site `<img src>` ile gösterir → `express.static` resmi diskten sunar. (Resim 1 kez bile DB'ye girmedi.)

## 4.7 — Devam eden projeler + ilerleme çubuğu

**Ne:** "Üzerinde çalıştığım projeler" bölümü; her birinde % ilerleme çubuğu, admin'den **slider** ile ayarlanır. Dizi-CRUD **projeler editörüyle aynı** (pekiştirme); yeni olan: `range` input + yüzdeden çubuk çizmek.

**DB:** `wip_projects`: `id (AUTOINCREMENT), title, note, progress INTEGER DEFAULT 0`.

**Backend:** public `GET /api/wip` + korumalı `PUT /api/wip` (DELETE+INSERT). Yüzde backend'de **sabitlenir:**
```js
const p = Math.max(0, Math.min(100, Number(w.progress) || 0));  // 0-100 dışına çıkamaz
```
→ Backend frontend'e tam güvenmez; biri 999 yollasa 100'e iner. (Küçük ama doğru güvenlik alışkanlığı — **never trust the client**.)

**Frontend (`ProgressEditor.jsx`):** ProjectsEditor iskeleti (map/filter/spread) +:
```jsx
<input type="range" min="0" max="100" value={w.progress}
  onChange={(e) => updateItem(i, 'progress', Number(e.target.value))} />
<div className="bar"><div className="bar-fill" style={{ width: `${w.progress}%` }} /></div>
```
- **`Number(e.target.value)`** → range STRING verir, sayıya çeviririz.
- **`style={{ width: `${w.progress}%` }}`** → inline style ile çubuk genişliğini state'e bağladık; slider'ı çekince anında güncellenir.

**Frontend (`Home.jsx`):** `GET /api/wip` → `wip.length>0 &&` bölüm; her item'da `.bar/.bar-fill` çubuğu. CSS: `transition: width .3s` (yumuşak dolum) + `linear-gradient` (renkli).

---

## 4.8 — Tasarım: Tailwind + "Sumi & Steel" teması 🎨

**Ne:** Public site'ı (Home) brutalist + Japon temalı bir tasarıma geçirdik. **Yeni araç: Tailwind CSS.**

**Süreç:** Google **Stitch** (AI UI aracı) ile prompt'tan tasarım ürettik → Stitch bir **tasarım sistemi** ("Sumi & Steel") + Tailwind HTML verdi → ben o tasarımı bizim React bileşenlerine, **gerçek veriye bağlayarak** taşıdım. (Stitch MCP ile Claude Code'a bağlandı; tasarımı doğrudan çektim.)

**Tailwind nedir?** Hazır CSS "utility" sınıfları. Ayrı CSS yazmak yerine doğrudan HTML/JSX'te sınıf dizersin: `bg-surface border-2 border-on-surface shadow-[4px_4px_0px_#ff5541]`. Avantaj: hızlı, tutarlı, tasarım token'larına bağlı.

**Kurulum:**
- `npm install -D tailwindcss@3 postcss autoprefixer`
- `tailwind.config.js` → **tasarım token'ları** (renk/font/boşluk/tipografi) burada tanımlı; Stitch'in "Sumi & Steel" değerlerini birebir koyduk. Sınıf adları bu token'lardan üretilir (`bg-primary-container` → `#ff5541`).
- `postcss.config.js` → Tailwind'i derleyiciye bağlar.
- `src/index.css` → `@tailwind base/components/utilities` + brutalist temel (`* { border-radius: 0 }`, koyu arka plan, `pulse-fast` animasyonu).
- `index.html` → Google Fonts (Space Grotesk + JetBrains Mono) + `<html class="dark">`.

**Tasarım sistemi (Sumi & Steel) özü:**
- **Renk:** sumi mürekkebi `#141414` + washi beyazı `#e5e2e1` + torii kırmızısı `#ff5541` (primary-container) + indigo `#243b6b` + kintsugi altını `#cea72c`. Hepsi **düz** (gradient yok).
- **Tipografi:** Space Grotesk (başlık, iri/uppercase) + JetBrains Mono (etiket/terminal).
- **Şekil:** her yerde keskin 90° köşe (`border-radius: 0`).
- **Derinlik:** blur'suz **sert offset gölge** (`4px 4px 0px <renk>`) + kalın `2px` kenarlıklar. Hover'da öğe gölge yönüne kayar (`translate`).
- **Motif:** ejderha + maneki-neko kedi **woodblock damga** görselleri (`public/dragon.png`, `public/cat.png`), hanko mühürleri (`龍神印`), dikey Japonca metin (`writing-mode: vertical-rl`), terminal etiketleri.

**`Home.jsx` bölümleri (hepsi gerçek veriye bağlı):** üst telemetri şeridi · hero (isim + spec kutusu + ejderha damgası) · PROJELER (kapak görselli kartlar) · DEVAM EDENLER (brutalist ilerleme çubukları) · GITHUB · İLETİŞİM (terminal formu + kedi damgası) · footer.

**Önizleme:** `.claude/launch.json` ile Vite başlatılıp tarayıcı panelinde görüldü. **Not:** Admin paneli şimdilik eski (düz CSS) görünümünde — işlevi bozulmadı; istersek sonra temayı ona da uygularız.

---

# 5. Başvuru Tabloları ("şu neredeydi?")

## 5.1 — Tüm API uçları
| Metot | Yol | Koruma | Ne yapar |
|---|---|---|---|
| GET | `/api/content` | public | İçeriği döndürür (tek satır) |
| PUT | `/api/content` | 🔒 authGuard | İçeriği günceller |
| GET | `/api/projects` | public | Manuel projeleri döndürür |
| PUT | `/api/projects` | 🔒 authGuard | Projeleri kaydeder (DELETE+INSERT) |
| POST | `/api/contact` | public | Mesajı DB'ye yazar + mail gönderir |
| GET | `/api/messages` | 🔒 authGuard | Gelen mesajları listeler (yeni→eski) |
| POST | `/api/login` | public | Giriş; doğruysa JWT token döner |
| POST | `/api/upload` | 🔒 authGuard | Resim yükler, `{url}` döner |
| GET | `/api/github/repos` | public | GitHub'daki tüm repoları çeker |
| GET | `/api/github/featured` | public | Yayınlanan repoları (DB snapshot) döndürür |
| PUT | `/api/github/featured` | 🔒 authGuard | Seçili repoları kaydeder |
| GET | `/api/wip` | public | Devam eden projeleri döndürür |
| PUT | `/api/wip` | 🔒 authGuard | Devam eden projeleri kaydeder |
| (statik) | `/uploads/<dosya>` | public | Yüklenen görseli sunar (express.static) |

## 5.2 — DB şeması (`backend/db.js`)
```sql
content(        id PK, name, title, about, github, linkedin )          -- tek satır (id=1)
projects(       id PK AUTOINCREMENT, title, description, tech, image )  -- tech=JSON metni, image=yol
messages(       id PK AUTOINCREMENT, name, message, created_at )        -- created_at otomatik
featured_repos( github_id PK, name, description, url, language, stars ) -- GitHub snapshot
wip_projects(   id PK AUTOINCREMENT, title, note, progress )            -- progress 0-100
```
**SQL temelleri:** `CREATE TABLE` (şema), `SELECT`/`.get()` (tek satır)/`.all()` (hepsi), `INSERT`, `UPDATE ... WHERE`, `DELETE`.
**Parametreli sorgu:** `db.prepare('... ?').run(deger)` — değer SQL metnine **string olarak yapıştırılmaz**.
**Migration:** var olan tabloya veri kaybetmeden sütun ekleme:
```js
const cols = db.prepare('PRAGMA table_info(projects)').all();        // sütunları listele
if (!cols.some(c => c.name === 'image')) db.exec('ALTER TABLE projects ADD COLUMN image TEXT');
```
`CREATE TABLE IF NOT EXISTS` var olan tabloya **yeni sütun eklemez**; o yüzden `ALTER TABLE` + PRAGMA kontrolü gerekti (image, github, linkedin bu yolla eklendi).
**Tohumlama (seed):** tablo boşsa (`SELECT COUNT(*)`) JSON'dan ilk veriyi yükler — yalnızca ilk çalışmada.

## 5.3 — Güvenlik özeti (mülakat için)
| Önlem | Nerede | Engellediği saldırı |
|---|---|---|
| bcrypt hash | `.env` şifre | Sızıntıda şifre çıkmaz; brute-force / rainbow table |
| Aynı login hata mesajı | `/api/login` | User enumeration |
| JWT imza | `jwt.sign/verify` | Token sahteciliği (tampering) |
| `expiresIn: 2h` | token | Çalınan token'ın ömrünü kısaltır |
| authGuard | korumalı uçlar | Broken Access Control (OWASP #1) |
| `?` parametreli sorgu | tüm DB çağrıları | **SQL Injection** |
| Token backend'de | GitHub çağrısı | Secret exposure (tarayıcıya sızma) |
| Least privilege token | GitHub classic token | Sızıntıda hasarı sınırlar |
| fileFilter / limits / rename | multer | Malicious upload / DoS / path traversal |
| progress clamp (0-100) | `/api/wip` | Bozuk/aşırı girdi (never trust client) |
| `.gitignore`: `.env`, `*.db`, `uploads/` | repo | Secret'ın public repo'ya sızması |
| `rel="noreferrer"` dış linkler | Home | Referrer/tabnabbing sızıntısı |

**Henüz yapılmadı (geliştirme listesi):** login rate-limit (brute-force), input validation (zod), localStorage→httpOnly cookie (XSS), CORS'u daralt, HTTPS.

## 5.4 — Frontend dosya haritası
| Dosya | Tür | Sorumluluk |
|---|---|---|
| `main.jsx` | giriş | `<App/>`'i `<BrowserRouter>` ile sarar |
| `App.jsx` | router | `/`→Home, `/admin`→Admin |
| `pages/Home.jsx` | sayfa | Public site: content, projeler, wip, GitHub, iletişim |
| `pages/Admin.jsx` | sayfa | Login + içerik formu; alt bileşenleri barındırır |
| `components/ProjectsEditor.jsx` | bileşen | Proje CRUD + görsel yükleme |
| `components/MessagesList.jsx` | bileşen | Mesaj listesi (korumalı) |
| `components/GithubRepos.jsx` | bileşen | Repo listesi + yayın seçimi |
| `components/ProgressEditor.jsx` | bileşen | Devam eden projeler + slider |
- **pages/** = bir URL'e karşılık gelen tam ekran. **components/** = sayfaların içine konan parçalar (kendi URL'leri yok).
- **props:** `<ProjectsEditor token={token}/>` → üstten alta veri; alt `function X({ token })` ile alır.

## 5.5 — React kavram sözlüğü
- **useState** → bileşenin hafızası; `setX` ile değişince React arayüzü yeniden çizer.
- **useEffect(fn, [])** → bileşen ilk gelince **bir kez** çalışır (veri çekme). `[token]` → token değişince tekrar çalışır.
- **controlled input** → `value={state}` + `onChange`; React input'u kontrol eder.
- **immutable update** → state'i bozmadan **yeni** obje/dizi ver: `{...prev, [key]:v}`, `map`, `filter`, `[...prev, yeni]`.
- **optional chaining `?.`** → `content?.name`: `content` null iken çökmeyi önler.
- **koşullu render** → `{x.length > 0 && <...>}` / `if (!token) return <Login/>`.
- **lazy initial state** → `useState(() => localStorage.getItem('token') || '')`.
- **key** → listede `.map` ederken her öğeye benzersiz `key` (React için).

## 5.6 — Node/Express kavram sözlüğü
- `require('x')` → modül içe aktarma (CommonJS). `fs`,`path` yerleşik; `express`,`cors`,`multer`... npm paketi.
- `app.use(fn)` → **middleware** (her istekte route'tan önce: cors, express.json, express.static).
- `app.get/post/put('/yol', [guard,] handler)` → route. `req`=istek, `res`=cevap.
- `req.body` (express.json doldurur), `req.headers`, `req.file` (multer), `res.json(x)`, `res.status(n)`.
- `__dirname` → dosyanın klasörü. `path.join(...)` → güvenli yol.
- **HTTP durum kodları:** 200 ok, 400 kötü istek, 401 yetkisiz, 404 yok, 500 sunucu hatası, 502 bad gateway.
- **REST metotları:** GET oku, POST oluştur, PUT güncelle, DELETE sil.
- **async/await:** promise'leri senkron gibi yazma. `await p` → p çözülene kadar **bu fonksiyonu** bekletir (programı değil). Hata → `try/catch`.
- **Lifecycle:** kod başta **bir kez** çalışır (kur + BEKLE); route'lar **sonra**, her istekte tetiklenir (event-driven).

## 5.7 — Hata günlüğü (yaşadıklarımız + ders)
| Hata | Sebep | Çözüm / ders |
|---|---|---|
| "Backend'e ulaşılamadı" (ilk açılış) | Sayfa, backend hazır olmadan istek attı | Yenile; frontend bağımlı olduğu API çalışıyor olmalı |
| `EADDRINUSE :::3001` | Eski node portu tutuyor | `kill $(lsof -t -i:3001)`; Node'u hep Ctrl+C ile kapat |
| İçerik kaydolmadı | İki "Kaydet" butonu karışmış + `about` Home'da basılmıyordu | Butonları netle; **sakladığın her alanı ekranda da göster** |
| GitHub "yüklenemedi" | Token'sız **403 rate limit** | GitHub classic token (scope'suz), `.env`'e `GITHUB_TOKEN` |
| bcrypt kurulum uyarısı | native derleme (npm 11) | `bcryptjs` (saf JS) kullan |

---

# 6. 🔜 Sıradaki fikirler
- [ ] **Tasarım** (içerik oturdu; görünümü güzelleştir) — öncelik
- [ ] **Frontend'i baştan oturtma turu** (React/state/props/CSS kafaya net otursun) — tasarımdan önce
- [ ] Güvenlik/aktivite logu (başarısız girişler, IP) — SOC geçmişiyle örtüşen, öne çıkaran feature
- [ ] Blog (yeni içerik tipi)
- [ ] Deploy (yayına alma) + production sertleştirmeleri (bkz. 5.3 "henüz yapılmadı")
- [ ] Docker ile paketleme

---
