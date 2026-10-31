import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Katana from '../components/Katana.jsx'

import { API } from '../api.js'

// Cok dilli degeri coz: {tr,en} ise secili dili dondur, degilse oldugu gibi
function pick(v, lang) {
  if (v && typeof v === 'object' && !Array.isArray(v) && ('tr' in v || 'en' in v)) {
    return v[lang] ?? v.tr ?? v.en
  }
  return v
}

// Home = herkese acik ana site (Sumi & Steel brutalist tema)
function Home() {
  const [content, setContent] = useState(null)
  const [projects, setProjects] = useState([])
  const [featured, setFeatured] = useState([])
  const [wip, setWip] = useState([])
  const [notes, setNotes] = useState([])
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('')
  const [active, setActive] = useState('hero')   // nav'da hangi bolumdeyiz
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('theme') || 'light' } catch { return 'light' }
  })
  const [notesLang, setNotesLang] = useState(() => {
    try { return localStorage.getItem('notesLang') || 'en' } catch { return 'en' }
  })
  const [notesPage, setNotesPage] = useState(0)   // bento sayfalama (0-tabanli)

  // Tema degisince html sinifini guncelle + hatirla
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('light', theme === 'light')
    root.classList.toggle('dark', theme !== 'light')
    try { localStorage.setItem('theme', theme) } catch {}
  }, [theme])

  // Not dili tercihini hatirla
  useEffect(() => {
    try { localStorage.setItem('notesLang', notesLang) } catch {}
  }, [notesLang])

  // Navigasyonda scroll'u yonet (SPA scroll tasmasini onle):
  // /#notes ile dönülürse notlar section'ina, diğer her girişte en üste.
  const location = useLocation()
  useEffect(() => {
    if (location.hash === '#notes') {
      const go = () => document.getElementById('notes')?.scrollIntoView()
      go()
      const t = setTimeout(go, 80) // layout otursun diye tekrar dene
      return () => clearTimeout(t)
    } else {
      window.scrollTo(0, 0)
    }
  }, [location.key, notes.length])

  useEffect(() => {
    fetch(`${API}/api/content`).then((r) => r.json()).then(setContent).catch(() => {})
    fetch(`${API}/api/projects`).then((r) => r.json()).then(setProjects).catch(() => {})
    fetch(`${API}/api/github/featured`).then((r) => r.json()).then(setFeatured).catch(() => {})
    fetch(`${API}/api/wip`).then((r) => r.json()).then(setWip).catch(() => {})
    fetch(`${API}/api/notes`).then((r) => r.json()).then(setNotes).catch(() => {})
  }, [])

  // Hangi bolumdeyiz? Ekranin ~%40 cizgisi hangi bolumun icindeyse o aktif olur.
  useEffect(() => {
    const ids = ['hero', 'notes', 'projects', 'in-progress', 'open-source', 'contact']
    const update = () => {
      const probe = window.innerHeight * 0.4
      let current = 'hero'
      for (const id of ids) {
        const el = document.getElementById(id)
        if (!el) continue
        const r = el.getBoundingClientRect()
        if (r.top <= probe && r.bottom > probe) {
          current = id
          break
        }
      }
      setActive(current)
    }
    requestAnimationFrame(update)                 // ilk render sonrasi kesin calis
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [notes.length, projects.length, wip.length, featured.length])

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('> GONDERILIYOR...')
    try {
      const res = await fetch(`${API}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message }),
      })
      const data = await res.json()
      if (data.ok) {
        setStatus('> SINYAL ILETILDI. TESEKKURLER.')
        setName('')
        setMessage('')
      }
    } catch {
      setStatus('> HATA: BACKEND YANIT VERMIYOR.')
    }
  }

  // --- Yeniden kullanilan parcalar ---
  // Aksan paleti: kirmizi -> indigo -> altin (renkleri bolumlere yaymak icin)
  const ACCENTS = ['#ff5541', '#324879', '#cea72c']
  const accentOf = (i) => ACCENTS[i % ACCENTS.length]

  // --- NOTLAR bento sayfalama ---
  // Her sayfa: 1 buyuk (featured) + 5 kucuk = 6 kart (3-kolon bento tam oturur)
  const NOTES_PER_PAGE = 6
  const notesTotalPages = Math.max(1, Math.ceil(notes.length / NOTES_PER_PAGE))
  const pageNotes = notes.slice(notesPage * NOTES_PER_PAGE, notesPage * NOTES_PER_PAGE + NOTES_PER_PAGE)
  // Featured kartin (ve katananin) rengi SAYFAYA gore donsun: s0 kirmizi, s1 mavi, s2 sari...
  const pageAccent = ACCENTS[notesPage % ACCENTS.length]
  // Notlar silinince mevcut sayfa araligi disina dusmesin
  useEffect(() => {
    if (notesPage > 0 && notesPage >= notesTotalPages) setNotesPage(0)
  }, [notesTotalPages, notesPage])

  const SectionHeader = ({ num, title, jp, right, accent = '#ff5541' }) => (
    <div className="border-b-2 border-on-surface bg-surface-container-low px-6 lg:px-12 py-5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <span
          className="border-2 font-label-code text-mono-lg px-2.5 py-0.5 font-bold"
          style={{ borderColor: accent, color: accent }}
        >
          {num}
        </span>
        <h2 className="font-headline-md text-headline-md text-on-surface uppercase font-bold tracking-tight flex items-center gap-3">
          <span>{title}</span>
          <span className="text-on-surface-variant font-normal">{jp}</span>
        </h2>
      </div>
      {right}
    </div>
  )

  return (
    <div className="w-full bg-background text-on-surface font-body-md min-h-screen">
      {/* NAVIGASYON (sticky) */}
      <header className="sticky top-0 z-50 mb-0 bg-surface-container-lowest border-b-2 border-on-surface">
        <div className="h-16 w-full px-4 lg:px-12 flex items-center justify-between">
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-label-code text-mono-md font-bold tracking-tight text-on-surface">ENES.DEV // 研二</span>
            <span className="border-2 border-primary-container text-primary-container font-label-code text-label-code px-1.5 py-0.5 transform -rotate-3 font-bold shadow-[2px_2px_0px_#ff5541] select-none">[開]</span>
          </div>
          <nav className="hidden lg:flex items-stretch border-l-2 border-r-2 border-on-surface h-full">
            {[
              { id: 'hero', label: '00.HAKKIMDA' },
              { id: 'notes', label: '01.NOTLAR' },
              { id: 'projects', label: '02.PROJELER' },
              { id: 'in-progress', label: '03.DEVAM' },
              { id: 'open-source', label: '04.GITHUB' },
              { id: 'contact', label: '05.İLETİŞİM' },
            ].map((s, i, arr) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`flex items-center px-space-md font-label-code text-mono-md tracking-wider transition-none ${
                  i < arr.length - 1 ? 'border-r border-surface-variant' : ''
                } ${
                  active === s.id
                    ? 'bg-primary-container text-on-primary font-bold border-t-2 border-primary-container'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-primary-container'
                }`}
              >
                {s.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
              className="font-label-code text-label-code bg-surface-container-high px-2 py-1 border border-on-surface text-on-surface hover:text-primary-container tracking-wider"
              aria-label="Tema degistir"
            >
              {theme === 'light' ? 'KOYU ☾' : 'AÇIK ☀'}
            </button>
            <Link to="/admin" className="font-label-code text-label-code bg-surface-container-high px-2 py-1 border border-on-surface text-on-surface hover:text-primary-container tracking-wider">ADMIN ↗</Link>
          </div>
        </div>
      </header>

      {/* 01. HERO */}
      <section className="w-full min-h-[calc(100vh-4rem)] border-b-2 border-on-surface bg-surface grid grid-cols-1 lg:grid-cols-12" id="hero">
        {/* Sol: isim + metin */}
        <div className="wave-bg-lg lg:col-span-7 p-6 sm:p-10 lg:p-14 flex flex-col justify-start border-b-2 lg:border-b-0 lg:border-r-2 border-on-surface relative">
          <div className="absolute right-4 top-4 text-surface-container-high font-headline-lg text-display-xl font-bold select-none pointer-events-none opacity-20">
            龍
          </div>
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 border-2 border-on-surface bg-surface-container-low px-3 py-1 shadow-[3px_3px_0px_#324879]">
              <span className="w-2 h-2 bg-primary-container " />
              <span className="font-label-code text-label-code tracking-widest text-on-surface uppercase">
                [SYS.VER 1.0] // FULL-STACK DEVELOPER
              </span>
            </div>
            <div className="space-y-2">
              <h1 className="font-headline-lg text-headline-lg lg:text-display-xl text-on-surface tracking-tight uppercase font-bold leading-none">
                {content?.name || '...'}
              </h1>
              <p className="font-label-code text-mono-lg text-secondary tracking-widest uppercase">
                // {content?.title || 'developer'}
              </p>
            </div>
            {content?.about && (
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl leading-relaxed">
                {content.about}
              </p>
            )}
            {/* Terminal spec kutusu */}
            <div className="p-4 bg-surface-container-lowest border-2 border-on-surface shadow-[4px_4px_0px_#cea72c] space-y-2">
              <div className="flex items-center justify-between border-b border-surface-variant pb-1 font-label-code text-label-code text-tertiary">
                <span>PROFILE // READOUT</span>
                <span>v1.0</span>
              </div>
              <div className="font-label-code text-mono-md text-on-surface space-y-1">
                <div className="flex"><span className="text-on-surface-variant w-28 shrink-0">ROLE:</span> <span className="font-bold">{content?.title || 'Full-Stack Developer'}</span></div>
                <div className="flex"><span className="text-on-surface-variant w-28 shrink-0">STACK:</span> <span className="text-secondary">REACT · NODE · EXPRESS · SQLITE</span></div>
                <div className="flex"><span className="text-on-surface-variant w-28 shrink-0">STATUS:</span> <span className="text-primary-container font-bold">OPEN TO OPPORTUNITIES</span></div>
              </div>
            </div>
          </div>
          {/* Butonlar */}
          <div className="pt-8 flex flex-wrap gap-4 items-center">
            {content?.github && (
              <a className="px-6 py-3.5 bg-surface-container-lowest text-on-surface font-label-code text-mono-md font-bold tracking-wider border-2 border-on-surface shadow-[4px_4px_0px_#ff5541] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#ff5541] transition-none flex items-center gap-2 uppercase" href={content.github} target="_blank" rel="noreferrer">
                <span>GITHUB</span><span className="text-primary-container font-bold">↗</span>
              </a>
            )}
            {content?.linkedin && (
              <a className="px-6 py-3.5 bg-primary-container text-on-primary font-label-code text-mono-md font-bold tracking-wider border-2 border-on-surface shadow-[4px_4px_0px_#e5e2e1] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#e5e2e1] transition-none flex items-center gap-2 uppercase" href={content.linkedin} target="_blank" rel="noreferrer">
                <span>LINKEDIN</span><span>↗</span>
              </a>
            )}
            <a className="px-6 py-3.5 bg-transparent text-on-surface font-label-code text-mono-md font-bold tracking-wider border-2 border-on-surface-variant hover:border-primary-container hover:bg-surface-container-high hover:text-primary-container transition-none flex items-center gap-2 uppercase" href="#contact">
              <span>İLETİŞİM</span>
            </a>
          </div>
        </div>
        {/* Sağ: ejderha damgası */}
        <div className="wave-bg-lg lg:col-span-5 p-6 sm:p-10 lg:p-12 flex flex-col justify-start bg-surface-container-lowest relative">
          <div className="flex items-center justify-between border-b-2 border-on-surface pb-3">
            <div className="font-label-code text-mono-md text-primary-container font-bold flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-primary-container" />
              <span>ARTIFACT // 龍神</span>
            </div>
            <span className="font-label-code text-label-code text-on-surface-variant">ED. 2025</span>
          </div>
          <div className="my-6 relative border-2 border-on-surface p-4 bg-surface-container-low shadow-[6px_6px_0px_#ff5541]">

            <div className="relative overflow-hidden border border-surface-variant bg-surface-container-lowest flex items-center justify-center">
              <img alt="Dragon woodblock stamp" className="themed-art w-full h-auto object-contain filter contrast-125" src="/dragon.png" />
              <div className="absolute top-4 right-4 border-2 border-primary-container text-primary-container bg-surface-container-lowest/90 px-2 py-1 font-label-code text-mono-md font-bold tracking-widest transform rotate-3 select-none">
                龍神印
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-surface-variant pt-3">
            <div className="font-label-code text-label-code text-on-surface-variant flex items-center gap-3">
              <span className="text-primary-container font-bold">[龍神]</span>
              <span>DRAGON ARCHIVE</span>
            </div>
            <div className="[writing-mode:vertical-rl] font-label-code text-label-code text-on-surface tracking-widest font-bold">
              龍神 // NO. 09-K
            </div>
          </div>
        </div>
      </section>

      {/* 01. NOTLAR */}
      <section className="w-full border-b-2 border-on-surface bg-surface-container-lowest" id="notes">
        <SectionHeader
          num="01"
          title="NOTLAR"
          jp="[学習]"
          accent="#324879"
          right={
            <div className="flex items-center gap-3">
              <Link
                to="/notlar"
                className="font-label-code text-label-code bg-surface-container-high px-2.5 py-1 border-2 border-on-surface text-on-surface hover:text-primary-container tracking-wider uppercase font-bold"
              >
                {notesLang === 'tr' ? 'TÜM NOTLAR ↗' : 'ALL NOTES ↗'}
              </Link>
              <div className="flex border-2 border-on-surface">
                {['tr', 'en'].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setNotesLang(l)}
                    className={`font-label-code text-label-code px-2 py-1 tracking-wider uppercase ${
                      notesLang === l ? 'bg-primary-container text-on-primary font-bold' : 'bg-surface-container-high text-on-surface hover:text-primary-container'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          }
        />
        <div className="wave-bg p-6 lg:p-12">
          {notes.length === 0 && (
            <p className="font-label-code text-mono-md text-on-surface-variant">// {notesLang === 'tr' ? 'Henüz not yok.' : 'No notes yet.'}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:auto-rows-[190px] lg:min-h-[618px]">
            {pageNotes.map((n, i) => {
              const gi = notesPage * NOTES_PER_PAGE + i   // global index (kucuk kartlarin rengi icin)
              const featured = i === 0                      // her sayfanin ilk karti buyuk
              const cardAccent = featured ? pageAccent : accentOf(gi)  // featured = sayfa rengi
              return (
                <Link
                  key={n.slug}
                  to={`/notlar/${n.slug}`}
                  className={`bg-surface-container border-2 border-on-surface p-5 flex flex-col justify-between hover:translate-x-[2px] hover:translate-y-[2px] transition-none ${
                    featured ? 'sm:col-span-2 lg:row-span-2 relative overflow-hidden' : ''
                  }`}
                  style={{ boxShadow: `6px 6px 0px ${cardAccent}` }}
                >
                  {featured && (
                    <Katana
                      color={pageAccent}
                      className="pointer-events-none select-none absolute left-1/2 top-1/2 w-[86%] -translate-x-1/2 -translate-y-1/2 rotate-[-18deg] opacity-80"
                    />
                  )}
                  <div className="relative">
                    <span className="font-label-code text-label-code uppercase tracking-widest font-bold text-on-surface-variant">
                      {pick(n.category, notesLang)}
                    </span>
                    <h3
                      className={`text-on-surface font-bold uppercase mt-2 leading-tight ${
                        featured ? 'font-headline-lg text-headline-lg' : 'font-headline-sm text-headline-sm'
                      }`}
                    >
                      {pick(n.title, notesLang)}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="font-label-code text-label-code uppercase tracking-wider text-on-surface-variant">[{n.type}]</span>
                    <span className="font-headline-sm font-bold text-on-surface">→</span>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* --- Sayfalama (sadece 1 sayfadan fazlaysa) --- */}
          {notesTotalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setNotesPage((p) => Math.max(0, p - 1))}
                disabled={notesPage === 0}
                className="font-label-code text-mono-md font-bold px-3 py-1.5 border-2 border-on-surface bg-surface-container-high text-on-surface hover:text-primary-container disabled:opacity-30 disabled:cursor-not-allowed transition-none"
                aria-label="Önceki sayfa"
              >
                ←
              </button>
              {Array.from({ length: notesTotalPages }).map((_, p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setNotesPage(p)}
                  className={`font-label-code text-label-code font-bold w-9 h-9 border-2 border-on-surface transition-none ${
                    p === notesPage
                      ? 'bg-primary-container text-on-primary'
                      : 'bg-surface-container-high text-on-surface hover:text-primary-container'
                  }`}
                  aria-label={`Sayfa ${p + 1}`}
                  aria-current={p === notesPage ? 'page' : undefined}
                >
                  {p + 1}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setNotesPage((p) => Math.min(notesTotalPages - 1, p + 1))}
                disabled={notesPage === notesTotalPages - 1}
                className="font-label-code text-mono-md font-bold px-3 py-1.5 border-2 border-on-surface bg-surface-container-high text-on-surface hover:text-primary-container disabled:opacity-30 disabled:cursor-not-allowed transition-none"
                aria-label="Sonraki sayfa"
              >
                →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 02. PROJELER */}
      <section className="w-full border-b-2 border-on-surface bg-background" id="projects">
        <SectionHeader
          num="02"
          title="PROJELER"
          jp="[主成果物]"
          right={
            <div className="border-2 border-primary-container text-primary-container font-label-code text-mono-md px-2 py-0.5 font-bold transform -rotate-2">
              極
            </div>
          }
        />
        <div className="wave-bg p-6 lg:p-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {projects.length === 0 && (
            <p className="font-label-code text-mono-md text-on-surface-variant">// Henuz proje yok.</p>
          )}
          {projects.map((p, i) => (
            <article key={p.id} className="bg-surface-container border-2 border-on-surface flex flex-col justify-between" style={{ boxShadow: `10px 10px 0px ${accentOf(i)}` }}>
              <div className="border-b-2 border-on-surface bg-surface-container-lowest text-on-surface px-5 py-2.5 flex items-center justify-between font-label-code text-mono-md font-bold">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5" style={{ background: accentOf(i) }} />
                  ARTIFACT_{String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-label-code text-secondary tracking-widest">DEPLOYED</span>
              </div>
              {p.image && (
                <div className="border-b-2 border-on-surface bg-surface-container-lowest p-2">
                  <img alt={p.title} className="w-full h-44 object-cover border border-surface-variant filter contrast-110" src={`${API}${p.image}`} />
                </div>
              )}
              <div className="p-6 space-y-4">
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight uppercase">
                  {p.title}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {p.tech.map((t) => (
                    <span key={t} className="px-2.5 py-1 bg-surface-container-lowest border border-on-surface font-label-code text-label-code text-on-surface uppercase">
                      [{t}]
                    </span>
                  ))}
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  {p.desc}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 03. DEVAM EDEN PROJELER */}
      {wip.length > 0 && (
        <section className="w-full border-b-2 border-on-surface bg-surface-container-lowest" id="in-progress">
          <SectionHeader
            num="03"
            title="DEVAM EDENLER"
            jp="[現在開発中]"
            accent="#cea72c"
            right={
              <div className="flex items-center gap-2 font-label-code text-label-code text-primary-container font-bold">
                <span className="inline-block w-2 h-2 bg-primary-container" />
                <span>DAEMON: ACTIVE // {wip.length} THREADS</span>
              </div>
            }
          />
          <div className="wave-bg p-6 lg:p-12 space-y-6">
            {wip.map((w, i) => (
              <div key={w.id} className="p-6 bg-surface border-2 border-on-surface space-y-4" style={{ boxShadow: `8px 8px 0px ${accentOf(i)}` }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-variant pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-label-code text-mono-md font-bold" style={{ color: accentOf(i) }}>[{String(i + 1).padStart(2, '0')}]</span>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold uppercase">{w.title}</h3>
                  </div>
                  <span className="font-label-code text-label-code bg-surface-container-high px-2.5 py-1 border border-surface-variant text-tertiary">
                    IN PROGRESS
                  </span>
                </div>
                {w.note && <p className="font-body-md text-body-md text-on-surface-variant">{w.note}</p>}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-label-code text-label-code">
                    <span className="text-on-surface">PROGRESS</span>
                    <span className="font-bold" style={{ color: accentOf(i) }}>{w.progress}% COMPILED</span>
                  </div>
                  <div className="w-full h-6 bg-surface-container-lowest border-2 border-on-surface p-0.5 flex gap-1">
                    <div className="h-full" style={{ width: `${w.progress}%`, background: accentOf(i) }} />
                    <div className="h-full bg-surface-container-high flex-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 04. GITHUB */}
      {featured.length > 0 && (
        <section className="w-full border-b-2 border-on-surface bg-background" id="open-source">
          <SectionHeader
            num="04"
            title="GITHUB"
            jp="[オープンソース]"
            accent="#324879"
            right={<span className="font-label-code text-label-code text-tertiary">[PUBLIC REGISTRY]</span>}
          />
          <div className="wave-bg p-6 lg:p-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((r) => (
              <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="block bg-surface-container border-2 border-on-surface shadow-[8px_8px_0px_#324879] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0px_#324879] transition-none">
                <div className="border-b-2 border-on-surface bg-surface-container-lowest px-4 py-2 flex items-center justify-between font-label-code text-label-code">
                  <span className="flex items-center gap-2 text-on-surface"><span className="w-2 h-2 bg-secondary" /> REPO</span>
                  <span className="text-tertiary">★ {r.stars}</span>
                </div>
                <div className="p-5 space-y-2">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold uppercase break-words">{r.name}</h3>
                  {r.desc && <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{r.desc}</p>}
                  {r.language && (
                    <span className="inline-block px-2 py-0.5 bg-surface-container-lowest border border-on-surface font-label-code text-label-code text-secondary uppercase">
                      {r.language}
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* 05. İLETİŞİM */}
      <section className="w-full border-b-2 border-on-surface bg-surface-container-lowest" id="contact">
        <SectionHeader num="05" title="İLETİŞİM" jp="[連絡]" accent="#cea72c" />
        <div className="wave-bg p-6 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form className="lg:col-span-8 lg:order-2 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="font-label-code text-label-code text-tertiary uppercase">&gt; adin</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-surface border-2 border-surface-variant focus:border-primary-container focus:outline-none px-4 py-3 font-label-code text-mono-md text-on-surface"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-label-code text-label-code text-tertiary uppercase">&gt; mesajin</label>
              <textarea
                rows="5"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                className="w-full bg-surface border-2 border-surface-variant focus:border-primary-container focus:outline-none px-4 py-3 font-label-code text-mono-md text-on-surface resize-none"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3.5 bg-primary-container text-on-primary font-label-code text-mono-md font-bold tracking-wider border-2 border-on-surface shadow-[4px_4px_0px_#e5e2e1] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#e5e2e1] transition-none uppercase"
            >
              SİNYAL GÖNDER →
            </button>
            {status && <p className="font-label-code text-mono-md text-primary-container">{status}</p>}
          </form>
          {/* Kedi damgası */}
          <div className="lg:col-span-4 lg:order-1 border-2 border-on-surface bg-surface p-4 shadow-[5px_5px_0px_#cea72c]">
            <div className="flex items-center justify-between border-b border-surface-variant pb-2 font-label-code text-label-code text-on-surface-variant">
              <span>MANEKI-NEKO</span>
              <span className="text-tertiary">招き猫</span>
            </div>
            <img alt="Maneki-neko cat stamp" className="themed-art w-full h-auto object-contain filter contrast-110 my-3" src="/cat.png" />
            <p className="font-label-code text-label-code text-on-surface-variant text-center">// GOOD FORTUNE ENGINE</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="w-full bg-surface-container-lowest px-6 lg:px-12 py-6 flex flex-wrap items-center justify-between font-label-code text-label-code text-on-surface-variant">
        <span>© 2026 {content?.name || ''} // BUILT WITH REACT · NODE · SQLITE</span>
        <span className="text-primary-container">[終]</span>
      </footer>
    </div>
  )
}

export default Home
