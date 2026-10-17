# 📘 Portfolio — Öğrenme Günlüğü (wdwd.md)

Bu dosya: bu projede **ne yaptığımızı, neyi neden yaptığımızı** adım adım anlatır.
Amaç — sana yaptırdığım her şeyi buradan okuyup **gerçekten anlaman**; kodun arkasında durabilmen.
Her yeni adımda bu dosya güncellenir.

---

## 🗂️ Proje Yapısı
```
~/Desktop/Portfolio/
├── frontend/   → React (Vite). Kullanıcının tarayıcıda gördüğü arayüz.
├── backend/    → Node + Express. Veri sunan API.
└── wdwd.md     → bu dosya.
```

---

## 🧩 Temel Kavramlar
- **Frontend** = kullanıcının gördüğü/etkileştiği taraf (arayüz, tarayıcıda çalışır).
- **Backend** = arka plandaki sunucu; veriyi, mantığı, (ileride) veritabanını yönetir.
- **API** = frontend ile backend'in konuştuğu "menü". Frontend "şu veriyi ver" der (HTTP isteği), backend cevap döner (genelde **JSON**).
- **localhost** = kendi bilgisayarın. **port** = o bilgisayardaki bir kapı numarası (5173, 3001...). `localhost:5173` = kendi makinendeki 5173 kapısı.

---

## ✅ Adım 1 — Frontend (React + Vite)

**Çalıştırdığımız komutlar:**
```bash
# 1) frontend/ klasörüne hazır React iskeleti kur
npm create vite@latest frontend -- --template react

# 2) paketleri indir + geliştirme sunucusunu başlat
cd frontend && npm install && npm run dev
```

**Satır satır ne yaptı:**
- `npm create vite@latest frontend -- --template react` → `frontend/` içine hazır bir **React** projesi (dosyalar + yapılandırma) kurdu.
- `npm install` → `package.json`'da yazılı paketleri `node_modules/` içine indirdi.
- `npm run dev` → **geliştirme sunucusunu** başlattı → `http://localhost:5173`.

**Vite nedir?** Modern frontend geliştirme aracı. İki işi var:
- Geliştirmede: hızlı yerel sunucu + **hot-reload** (dosyayı kaydedince tarayıcı anında güncellenir).
- Yayına çıkarken: `npm run build` → kodu optimize edip statik dosyalara paketler.

**Önemli dosya:** `frontend/src/App.jsx` → ana React bileşeni; arayüzü burada yazarız.

**Dev döngüsü:** yaz → kaydet → tarayıcıda anında gör → tekrar.

**Vite vs Apache:** İkisi de web sunucusu. Vite = **geliştirme** (sadece sen, canlı düzenleme). Apache = **production** (bitmiş siteyi herkese sunar). İleride `npm run build` çıktısını Apache/Nginx ile sunabilirsin. Farklı aşamalar.

---

## ✅ Adım 2 — Backend (Node + Express) + Frontend'e Bağlama

**Amaç:** Frontend'in veri çekeceği bir API yazmak ve ikisini bağlamak.

### 2.1 — Backend dosyaları
`backend/package.json` → projenin kimliği + bağımlılıklar:
```json
{
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.21.2"
  }
}
```
- **express** = Node için web sunucusu / API kütüphanesi.
- **cors** = farklı port/origin'den gelen isteklere izin (bkz. 2.2).

`backend/server.js` → API'nin kendisi:
```js
const express = require('express');
const cors = require('cors');

const app = express();     // uygulamayi olustur
const PORT = 3001;         // API bu portu dinler

app.use(cors());           // 5173'teki frontend'in 3001'e erisebilmesi icin
app.use(express.json());

const projects = [ /* proje verileri */ ];

app.get('/api/projects', (req, res) => {
  res.json(projects);      // istek gelince projeleri JSON olarak don
});

app.listen(PORT, () => console.log(`API ${PORT} portunda`));
```
Satır satır:
- `const app = express()` → uygulamayı oluşturur.
- `app.get('/api/projects', ...)` → bir **endpoint**: biri `GET /api/projects` isterse `res.json(projects)` ile veriyi döner.
- `app.listen(3001)` → sunucuyu 3001 portunda başlatır.

**Çalıştırma:**
```bash
cd backend
npm install      # express + cors indirir (node_modules/)
node server.js   # sunucu baslar -> "API http://localhost:3001 ..."
```

### 2.2 — CORS nedir? (önemli)
Tarayıcı güvenlik gereği bir sayfanın **farklı origin'e** (farklı port = farklı origin) istek atmasını varsayılan **engeller.** Frontend `5173`, backend `3001` → farklı origin. `app.use(cors())` backend'e "5173'ten gelen isteklere izin ver" dedirtir. Olmazsa tarayıcı isteği **bloklar**.

### 2.3 — Frontend'i API'ye bağlama (`frontend/src/App.jsx`)
```jsx
const [projects, setProjects] = useState([])   // veri deposu (state)

useEffect(() => {                               // bilesen yuklenince 1 KEZ calis
  fetch('http://localhost:3001/api/projects')   // API'ye istek at
    .then(res => res.json())                    // cevabi JSON yap
    .then(data => setProjects(data))            // state'e yaz -> arayuz guncellenir
}, [])

{projects.map(p => <article>{p.title}...</article>)}  // her projeyi karta ciz
```
Kavramlar:
- **useState** → bileşenin "hafızası". `setProjects` ile değişince React arayüzü otomatik yeniden çizer.
- **useEffect(fn, [])** → bileşen ilk geldiğinde **bir kez** çalışır (veri çekme gibi yan etkiler).
- **fetch** → tarayıcının HTTP istek fonksiyonu.
- **.map()** → dizideki her projeyi bir karta dönüştürür.

### 2.4 — Veri akışı (tam döngü)
```
React (5173) --fetch--> Express API (3001) --JSON--> React --render--> ekranda kartlar
```

### 🐞 Yaşadığımız gerçek hata (öğretici!)
Sayfa ilk açıldığında "Backend'e ulaşılamadı" dedi — çünkü **sayfa, backend tam başlamadan isteği attı.** Backend ayağa kalkınca **yenileyince** düzeldi. Ders: frontend bir API'ye bağımlıysa, o API **çalışıyor** olmalı; sıra/zamanlama önemli.

### ▶️ Projeyi çalıştırma (iki sunucu, iki terminal)
```bash
# Terminal 1 — backend
cd ~/Desktop/Portfolio/backend && node server.js

# Terminal 2 — frontend
cd ~/Desktop/Portfolio/frontend && npm run dev
```
Sonra tarayıcıda `http://localhost:5173`.

---

## ✅ Adım 3 — İletişim Formu (devam ediyor)

**Amaç:** Ziyaretçi ad + mesaj yazıp gönderecek; veri backend'e gidecek.

### 3.1 — GET vs POST
- **GET** = veri İSTEMEK (sunucudan al). `/api/projects` böyleydi.
- **POST** = veri GÖNDERMEK (sunucuya yolla). Form gönderimi POST'tur.

### 3.2 — Backend: mesajı alan endpoint (`backend/server.js`)
`/api/projects` bloğunun altına eklendi:
```js
const messages = [];   // gelen mesajlar (simdilik bellekte)

app.post('/api/contact', (req, res) => {
  const { name, message } = req.body;        // POST govdesindeki veri
  messages.push({ name, message });
  console.log('Yeni mesaj:', name, message);
  res.json({ ok: true });                    // "aldim" cevabi
});
```
- `app.post(...)` → **POST** endpoint (GET değil, çünkü veri **alıyoruz**).
- `req.body` → POST ile gelen veri burada durur. `app.use(express.json())` sayesinde otomatik çözülür.
- `res.json({ ok: true })` → frontend'e "aldım" cevabı.

⚠️ **Node hot-reload yapmaz** → `server.js` değişince backend'i **Ctrl+C** + `node server.js` ile yeniden başlat.

### 🐞 Hata: `EADDRINUSE: address already in use :::3001`
Port 3001'de **zaten** bir sunucu çalışıyor demek (eski bir `node server.js` düzgün kapanmamış). Çözüm — o portu tutan süreci bul ve kapat:
```bash
kill $(lsof -t -i:3001)   # 3001 portunu kullanan sureci oldur
```
Sonra `node server.js`'i tekrar çalıştır. (Node'u hep **Ctrl+C** ile düzgün kapatırsan bu hata olmaz.)

### 3.3 — Frontend: iletişim formu (`frontend/src/App.jsx`)

**Yeni state'ler:**
```jsx
const [name, setName] = useState('')       // Adin input degeri
const [message, setMessage] = useState('') // Mesajin input degeri
const [status, setStatus] = useState('')   // gonderim durumu
```

**Form (JSX):**
```jsx
<form className="contact" onSubmit={handleSubmit}>
  <input
    value={name}                               // input'un degeri = state
    onChange={(e) => setName(e.target.value)}  // yazinca state'i guncelle
    required
  />
  <textarea value={message} onChange={(e) => setMessage(e.target.value)} required />
  <button type="submit">Gönder</button>
</form>
```

**Gönderme fonksiyonu:**
```jsx
async function handleSubmit(e) {
  e.preventDefault()                          // sayfa yeniden yuklenmesini engelle
  const res = await fetch('http://localhost:3001/api/contact', {
    method: 'POST',                                   // veri GONDER
    headers: { 'Content-Type': 'application/json' },  // govde JSON
    body: JSON.stringify({ name, message }),          // objeyi JSON metnine cevir
  })
  const data = await res.json()
  if (data.ok) { setStatus('Gonderildi!'); setName(''); setMessage('') }
}
```

**Yeni kavramlar:**
- **Controlled input:** `value={name}` + `onChange`. Input'un değeri state'tir; yazınca state güncellenir, state de input'u sürer. React input'u "kontrol eder". React'in temel form kalıbı.
- **`onSubmit` + `e.preventDefault()`:** Form varsayılan olarak gönderilince **sayfayı yeniler** (eski web davranışı). `preventDefault` bunu durdurur, biz JS ile hallederiz.
- **fetch ile POST:** `method: 'POST'`, `headers` (Content-Type: application/json), `body: JSON.stringify(...)`. GET'te sadece okuyorduk; POST'ta **veri gönderiyoruz**.
- **`async/await`:** `.then()` zinciri yerine daha okunur yol. `await`, cevabı bekler.

**Tam döngü:**
```
Form (5173) --POST--> /api/contact (3001) --console.log + {ok:true}--> Form "Gonderildi!"
```

---

## 🔜 Adım 4 — Admin Panel (devam ediyor)

**Amaç:** Her içerik bloğunu (isim, başlık, hakkımda...) panelden **düzenleyebilmek.** Panel **kullanıcı adı + şifre** istesin, güvenli olsun.

**Yol haritası:**
1. **4.1** İçeriği `content.json`'a taşı → site oradan okusun. *(bitti)*
2. **4.2** Admin girişi → şifre **bcrypt** ile hash'li; giriş olunca **JWT token**.
3. **4.3** Düzenleme ucunu **koru** → sadece token'ı olan düzenlesin (auth middleware).
4. **4.4** Admin sayfası → login + düzenleme formu.

**Güvenlik ilkeleri:**
- Şifre **asla düz metin değil** → **bcrypt hash** (tek yönlü).
- Her istekte şifre gönderme → login sonrası **JWT token**.
- Düzenleme uçlarını **token ile koru**.
- Gizli anahtarları koda gömme → **.env**.
- *(Production'da dahası: HTTPS, login rate-limit, httpOnly cookie.)*

### 4.1 — İçeriği `content.json`'a taşı
`backend/content.json` → düzenlenebilir içerik:
```json
{ "name": "Enes", "title": "Developer & Cyber Security", "about": "..." }
```
`backend/server.js` → dosyayı okuyup döndüren endpoint:
```js
const fs = require('fs');
const path = require('path');
const CONTENT_FILE = path.join(__dirname, 'content.json');

app.get('/api/content', (req, res) => {
  const content = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf-8'));
  res.json(content);
});
```
- `fs.readFileSync(...)` → dosyayı metin olarak okur (`fs` = Node'un dosya modülü).
- `JSON.parse(...)` → metni JS objesine çevirir.
- `__dirname` → server.js'in bulunduğu klasör (yolu güvenli kurar).

`frontend/src/App.jsx` → içeriği çekip başlıkta kullan:
```jsx
const [content, setContent] = useState(null)
useEffect(() => { fetch('.../api/content').then(r => r.json()).then(setContent) }, [])
// ...
<h1>{content?.name}</h1>
<p>{content?.title}</p>
```
- `content?.name` → **optional chaining**: `content` henüz `null` iken (veri gelmeden) çökmeyi önler, `undefined` döner.

#### 💡 Neden `content.json` dosyası, `projects` neden kodda?
Fark **yazılabilirlik**:
| Veri | Nerede | Çalışırken değişir mi? |
|---|---|---|
| `projects` | projects.json (veri dosyası) | **Evet** — panel/GitHub'dan doldurulabilir |
| `content` | content.json (veri dosyası) | **Evet** — panel kaydedecek |
| `messages` | bellekte dizi | Değişir ama **kalıcı değil** (restart'ta gider) |

İlke: yalnızca **okunan** veri kodda durabilir; programın **yazıp kaydetmesi** ve restart'ta kaybolmaması gereken veri ayrı bir **dosyaya/veritabanına** gider. (Çalışan program `.json`'u yazabilir ama kendi `.js` kaynağını yazamaz.)

**Yaptık:** `projects` artık `backend/projects.json`'da (content ile tutarlı). `server.js` içindeki sabit dizi kaldırıldı; endpoint dosyadan okuyor:
```js
const PROJECTS_FILE = path.join(__dirname, 'projects.json');
app.get('/api/projects', (req, res) => {
  const projects = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'));
  res.json(projects);
});
```
İleride: projeler GitHub reposundan çekilip seçilenler buraya yazılabilir.

### 4.2 — Admin girişi (auth) — devam ediyor

**4.2a — Gizli bilgiler (.env) + şifre hash'i**
- Admin bilgileri ve gizli anahtar **koda değil**, `backend/.env`'e konur (git'e gitmez):
```
ADMIN_USERNAME=enes
ADMIN_PASSWORD_HASH=<bcrypt hash>
JWT_SECRET=<rastgele uzun string>
```
- **`.env`** = ortam değişkenleri (environment variables) dosyası. Gizli/ortama özel ayarlar burada; `dotenv` paketi bunları `process.env`'e yükler.
- **`.gitignore`** → `.env` ve `node_modules/` git'e **gönderilmez** (secret'lar GitHub'a sızmasın).
- **Şifre hash'i** — parolayı düz değil, bcryptjs ile hash'li saklarız:
```bash
node -e "console.log(require('bcryptjs').hashSync('sifren', 10))"
```
→ `$2b$10$...` çıkar (Wazuh'taki `$6$...` gibi: tek yönlü + salt'lı + kasıtlı yavaş). `10` = cost (round sayısı; yüksek = daha yavaş = kırması daha zor).

**4.2b — Login endpoint (`POST /api/login`)**
```js
require('dotenv').config();              // .env -> process.env (EN USTTE)
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (username !== process.env.ADMIN_USERNAME)
    return res.status(401).json({ error: 'hatali' });
  const ok = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
  if (!ok) return res.status(401).json({ error: 'hatali' });
  const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '2h' });
  res.json({ token });
});
```
- `require('dotenv').config()` → `.env`'i `process.env`'e yükler (en üstte, kullanmadan önce).
- `bcrypt.compare(girilen, hash)` → hash **çözülmez**; girilen şifre aynı salt'la hash'lenip karşılaştırılır → `true/false`. (Login = kullanıcı tahmini verir, biz hash'leyip karşılaştırırız — Wazuh'taki "kırma" mantığının meşru hali.)
- Kullanıcı adı + şifre için **aynı hata mesajı** → hangisi yanlış belli olmasın (username enumeration'ı önler).
- `res.status(401)` → HTTP durum kodu. 200=ok, 401=yetkisiz, 404=bulunamadı, 500=sunucu hatası.
- `jwt.sign(payload, secret, opts)` → **imzalı token** üretir. Payload = token içi bilgi; secret ile imzalanır (sahtesi üretilemez); `expiresIn` = geçerlilik süresi.

**JWT nedir:** `header.payload.signature` yapısında bir metin. İmza (JWT_SECRET ile) gerçekliğini kanıtlar. İstemci token'ı saklar, sonraki isteklerde gönderir; sunucu imzayı doğrulayıp güvenir. **Stateless** — sunucu oturum tutmaz.

**Test (curl):**
```bash
curl -X POST localhost:3001/api/login -H "Content-Type: application/json" -d '{"username":"enes","password":"SIFREN"}'
# dogru -> {"token":"eyJ..."}   /   yanlis -> {"error":"..."}
```
`-X`=method, `-H`=header, `-d`=gövde (data).

**4.3 — Düzenleme ucunu koru (middleware) + içeriği güncelle**
```js
// Guard: token'i dogrula
function authGuard(req, res, next) {
  const token = (req.headers.authorization || '').split(' ')[1];  // "Bearer <token>"
  if (!token) return res.status(401).json({ error: 'Token gerekli' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);  // imza + sure OK mi?
    next();                                                 // devam
  } catch {
    return res.status(401).json({ error: 'Gecersiz token' });
  }
}

// Icerigi GUNCELLE (korumali)
app.put('/api/content', authGuard, (req, res) => {
  fs.writeFileSync(CONTENT_FILE, JSON.stringify(req.body, null, 2));  // dosyaya YAZ
  res.json({ ok: true });
});
```
- **Middleware (guard):** `(req, res, next)` imzalı fonksiyon; endpoint'ten **önce** çalışır. Ya `next()` (geç) ya da cevap döner (engelle). `app.put('/yol', authGuard, handler)` → sadece bu route korunur.
- **Authorization header:** İstemci token'ı `Authorization: Bearer <token>` başlığında gönderir; biz ayıklarız.
- **`jwt.verify(token, secret)`** → imzayı ve süreyi kontrol eder. Bozuk/süresi geçmiş → hata (catch → 401). Geçerli → payload döner. Oturum tutmadan **güven** böyle kurulur.
- **Authentication vs Authorization:** Login = *kimsin* (authentication). Guard = *yetkin var mı* (authorization).
- **`fs.writeFileSync(dosya, JSON.stringify(obj, null, 2))`** → objeyi JSON metnine çevirip dosyaya **YAZAR** (`null, 2` = 2 boşluk girintili). İşte content.json'u dosya yapmamızın sebebi: panel bunu **gerçekten güncelliyor.**
- **HTTP metodları (REST):** GET=oku, POST=oluştur, **PUT=güncelle**, DELETE=sil.

**Test (curl):**
```bash
# token YOK -> 401
curl -X PUT localhost:3001/api/content -H "Content-Type: application/json" -d '{"name":"Enes","title":"Test"}'
# token ILE -> guncellenir
curl -X PUT localhost:3001/api/content -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" -d '{"name":"Enes","title":"Full-Stack Dev","about":"..."}'
```

---

## 📎 Referans — async / await
- **Sorun:** JS tek thread'li; uzun işler (ağ, dosya, DB) senkron yapılırsa program donar.
- **Asenkron:** işi başlat, hattı boşalt, bitince devam et. (Kafede sipariş verip kenara çekilmek gibi.)
- **Promise:** "gelecekteki değerin sözü" → pending → fulfilled / rejected. `fetch`, `sendMail` promise döner.
- **async/await:** promise'leri senkron gibi yazma şekeri.
  ```js
  // then:  fetch(url).then(r=>r.json()).then(d=>...)
  // await: const r = await fetch(url); const d = await r.json()
  ```
- `await p` → p çözülene kadar **bu fonksiyonu** beklet (programı DEĞİL). Sadece `async` fonksiyon içinde.
- Hata: promise reject → `await` fırlatır → `try/catch` ile yakala.

---

## 📎 Referans — `server.js` anahtar kavramları (JS biliyorsan bunlar yeni)
- `require('x')` → Node'un modül içe aktarması (`import` gibi, CommonJS tarzı).
- `fs`, `path` → Node **yerleşik** modülleri; `express`, `cors` → npm paketleri (`node_modules/`).
- `const app = express()` → sunucu objesi; her şeyi `app` üzerinden yaparsın.
- `app.use(fn)` → **middleware**: her istekte, route'tan **önce** çalışır (cors, express.json).
- `__dirname` → bu dosyanın klasörü. `path.join(...)` → güvenli yol birleştirme.
- `app.get/post('/yol', (req, res) => {})` → **route**. `req` = gelen istek, `res` = gönderilecek cevap.
- `req.body` → POST ile gelen veri (express.json doldurur). `res.json(x)` → cevabı JSON yolla.
- `fs.readFileSync(dosya, 'utf-8')` → dosyayı metin oku. `JSON.parse` → metin→obje, `JSON.stringify` → obje→metin.
- `console.log(...)` → **sunucu terminaline** yazar (tarayıcıya değil).
- `app.listen(PORT, cb)` → sunucuyu başlat, portu dinle.
- **Lifecycle (event-driven):** kod başta **bir kez** çalışır (kur + BEKLE); route fonksiyonları **sonra**, her istek geldiğinde tetiklenir.

---

### 4.4 — Admin sayfası (frontend)

**4.4a — Routing (react-router-dom)**
React tek sayfadır; farklı "sayfalar" (`/`, `/admin`) için **react-router** kullanılır.
```bash
npm install react-router-dom
```
- `main.jsx`: `<App/>`'i `<BrowserRouter>` ile sarar → URL'yi dinler.
- `App.jsx`: artık **router** —
```jsx
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/admin" element={<Admin />} />
</Routes>
```
- Yeni yapı: `src/pages/Home.jsx` (eski App içeriği), `src/pages/Admin.jsx` (panel).
- Mantık: URL `/admin` olunca React `<Admin/>`'i gösterir, sayfa yenilemeden. `<Route path="x" element={<Y/>}/>` = "x adresi → Y bileşeni".

**4.4b — Login formu (`Admin.jsx`)**
```jsx
const [token, setToken] = useState(() => localStorage.getItem('token') || '')

async function handleLogin(e) {
  e.preventDefault()
  const res = await fetch('.../api/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const data = await res.json()
  if (data.token) { localStorage.setItem('token', data.token); setToken(data.token) }
}

if (!token) return <LoginFormu/>   // giris yapilmadi
return <Panel/>                    // giris yapildi
```
- **localStorage** → tarayıcı deposu; sayfa yenilense de **kalır**. Token'ı burada saklarız → yenileyince giriş düşmez. `setItem / getItem / removeItem`.
- **Koşullu render:** aynı bileşen, `token` state'ine göre ya login formu ya panel gösterir.
- `useState(() => localStorage.getItem('token') || '')` → ilk render'da token'ı depodan oku (lazy initial state).
- `type="password"` → şifreyi gizler.
- **Çıkış:** `localStorage.removeItem('token')` + `setToken('')`.
- *(Güvenlik notu: JWT'yi localStorage'da tutmak yaygın ama XSS'e açık; production'da httpOnly cookie daha güvenli.)*

**4.4c — Düzenleme formu (`Admin.jsx`) — PANEL TAMAM**
```jsx
const [content, setContent] = useState({ name:'', title:'', about:'' })

// giris yapilinca mevcut icerigi forma yukle
useEffect(() => { if (token) fetch('.../api/content').then(r=>r.json()).then(setContent) }, [token])

// bir alani immutable guncelle
function updateField(key, value) { setContent(prev => ({ ...prev, [key]: value })) }

// korumali kaydet
async function handleSave(e) {
  e.preventDefault()
  await fetch('.../api/content', {
    method: 'PUT',
    headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(content),
  })
}
```
- **İçeriği forma yükle:** `useEffect(..., [token])` → giriş yapılınca (token değişince) GET ile mevcut içeriği çekip forma koyar.
- **Obje state'i immutable güncelle:** `setContent(prev => ({ ...prev, [key]: value }))` → eskisini kopyala (`...prev`), sadece `[key]` alanını değiştir. React state'i doğrudan değiştirmeyiz, hep **yeni obje** veririz. (`[key]` = computed property — değişkenin değerini anahtar yapar.)
- **Korumalı kaydet:** PUT'a `Authorization: Bearer ${token}` başlığı eklenir → backend'deki `authGuard` doğrular. 401 → token geçersiz → tekrar giriş.

**🎯 Tam döngü kapandı:** login → token → formu doldur → düzenle → kaydet (PUT + token) → backend `authGuard` doğrular → `content.json` yazılır → ana site güncellenir. **Admin panel bitti.**

### 4.5 — Projeleri de panelden düzenle
Backend — content ile **aynı desen**, korumalı PUT:
```js
app.put('/api/projects', authGuard, (req, res) => {
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(req.body, null, 2));
  res.json({ ok: true });
});
```
Frontend — `components/ProjectsEditor.jsx` (Admin'e `token` **prop**'uyla gömülü). Yeni kavram: **dizi (array) düzenleme** — hep immutable:
```jsx
// guncelle (map)
prev.map((p, i) => i === index ? { ...p, [key]: value } : p)
// sil (filter)
prev.filter((_, i) => i !== index)
// ekle (spread)
[...prev, { id: newId, title:'', desc:'', tech:[] }]
```
- Dizi state'ini de orijinali bozmadan güncelleriz: `map` (değiştir), `filter` (sil), `[...prev, yeni]` (ekle).
- **tech** bir dizi; formda `p.tech.join(', ')` ile virgüllü metin gösterilir, kaydederken `value.split(',').map(t=>t.trim())` ile tekrar diziye çevrilir.
- **Props:** `<ProjectsEditor token={token} />` → üst bileşenden alt bileşene veri geçirme. Alt bileşen `function ProjectsEditor({ token })` ile alır. (Bileşen kompozisyonu.)

**🐞 Yaşadığımız hata (öğretici):** İçerik + projeler için **iki ayrı "Kaydet"** butonu vardı; içerik değişip projelerin butonuna basınca içerik kaydolmadı (`content.json` eski kaldı, `projects.json` değişti). Ders 1: **her form kendi verisini kaydeder**, buton etiketleri net olmalı ("İçeriği Kaydet" / "Projeleri Kaydet"). Ders 2: **sakladığın her alanı ekranda da göster** — `about`'u saklıyorduk ama Home'da basmıyorduk, o yüzden "değişmiyor" sanıldı. Eklenince görünür oldu.

---

### 4.6 — İletişim mesajını e-posta ile gönder (Nodemailer)
```js
const nodemailer = require('nodemailer');

// SMTP baglantisi (Gmail + app password)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD },
});

app.post('/api/contact', async (req, res) => {
  const { name, message } = req.body;
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      subject: `Yeni mesaj: ${name}`,
      text: `Gonderen: ${name}\n\n${message}`,
    });
  } catch (err) { console.error(err.message); }
  res.json({ ok: true });
});
```
- **Nodemailer** = Node e-posta kütüphanesi. **transporter** = SMTP bağlantısı (Gmail + app password).
- **SMTP** = e-posta gönderme protokolü. **App Password** = Gmail'in dış uygulamalara verdiği 16 haneli özel şifre (2FA şart; normal şifre kullanılmaz).
- Endpoint **async** oldu (`sendMail` await ister).
- **try/catch:** mail başarısız olsa bile form başarılı döner — e-posta "olursa iyi", form akışını bozmamalı.
- `.env`: `EMAIL_USER`, `EMAIL_APP_PASSWORD`, `EMAIL_TO` (hepsi secret, git'e gitmez).

---

## ✅ Adım 5 — Veritabanı (SQLite)

### 5.1 — DB kurulumu + content/projects'i taşıma
- **SQLite** = dosya-tabanlı SQL veritabanı; ayrı sunucu yok, tek dosya (`portfolio.db`). **node:sqlite** = Node'un **yerleşik** modülü (v22+), kurulum gerekmez. *(Başlangıçta "experimental" uyarısı normaldir.)*
- `backend/db.js`: DB'yi aç → tabloları oluştur → ilk çalışmada JSON'dan tohumla.
```js
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('portfolio.db');
db.exec(`CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, description TEXT, tech TEXT)`);
```
- **SQL temelleri:**
  - `CREATE TABLE` → tablo şeması (sütunlar + tipler). `PRIMARY KEY` = benzersiz kimlik, `AUTOINCREMENT` = otomatik artan id.
  - `SELECT ... FROM` → oku. `.get()` = tek satır, `.all()` = tüm satırlar.
  - `INSERT INTO ... VALUES (?, ?)` → ekle. `UPDATE ... SET ... WHERE` → güncelle. `DELETE FROM` → sil.
- **`db.prepare(sql)` + `?` yer tutucular** → parametreli sorgu; değerleri `.run(d1, d2)` / `.get(..)` / `.all(..)` ile geçir.
- **🔒 Güvenlik — SQL Injection:** Kullanıcı girdisini **ASLA** SQL metnine string olarak yapıştırma! Hep `?` yer tutucu + `.run(deger)` kullan → SQL injection'ı önler. (OWASP #1.)
- **tech dizisi:** SQL'de dizi tipi yok → `JSON.stringify` ile metin sakla, okurken `JSON.parse`.
- **desc → description:** `desc` SQL'de ayrılmış kelime (sıralama); sütunu `description` yaptık, API'de `desc` olarak eşledik (`r.description → desc`).
- Artık canlı veri **`portfolio.db`**'de; `content.json`/`projects.json` yalnızca ilk tohum. `*.db` → `.gitignore`.

---

## 🔜 Sıradaki fikirler
- [ ] Projeleri veritabanından çekmek (şu an kodda sabit)
- [ ] İletişim formu → backend'e POST
- [ ] Tasarımı güzelleştirmek
- [ ] Docker ile paketlemek (bildiğin konu, "zor katman")
- [ ] Deploy (yayına alma)

---
