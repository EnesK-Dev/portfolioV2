import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import PortsGrid from '../components/PortsGrid.jsx'
import CheatList from '../components/CheatList.jsx'
import Steps from '../components/Steps.jsx'
import Concept from '../components/Concept.jsx'
import Grouped from '../components/Grouped.jsx'

import { API } from '../api.js'

// tip -> render bileseni eslemesi (yeni tip = yeni satir)
const RENDERERS = { ports: PortsGrid, cheatsheet: CheatList, steps: Steps, concept: Concept, grouped: Grouped }
const ACCENTS = ['#ff5541', '#324879', '#cea72c']

// Cok dilli degeri coz: {tr,en} ise secili dili dondur, degilse oldugu gibi
function pick(v, lang) {
  if (v && typeof v === 'object' && !Array.isArray(v) && ('tr' in v || 'en' in v)) {
    return v[lang] ?? v.tr ?? v.en
  }
  return v
}

function Notes() {
  const { slug } = useParams()
  const [list, setList] = useState([])
  const [note, setNote] = useState(null)
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('theme') || 'light' } catch { return 'light' }
  })
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('notesLang') || 'en' } catch { return 'en' }
  })

  // tema
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('light', theme === 'light')
    root.classList.toggle('dark', theme !== 'light')
    try { localStorage.setItem('theme', theme) } catch {}
  }, [theme])

  // dil tercihini hatirla
  useEffect(() => {
    try { localStorage.setItem('notesLang', lang) } catch {}
  }, [lang])

  // not acilinca/degisince en uste kaydir (home'un scroll'unu tasima)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [slug])

  // not listesi
  useEffect(() => {
    fetch(`${API}/api/notes`).then((r) => r.json()).then(setList).catch(() => {})
  }, [])

  // secili not
  useEffect(() => {
    if (!slug) { setNote(null); setNotFound(false); return }
    setLoading(true)
    setNotFound(false)
    fetch(`${API}/api/notes/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => { setNote(data); setLoading(false) })
      .catch(() => { setNote(null); setNotFound(true); setLoading(false) })
  }, [slug])

  // TR | EN secici (segment)
  const LangToggle = () => (
    <div className="flex border-2 border-on-surface">
      {['tr', 'en'].map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={`font-label-code text-label-code px-2 py-1 tracking-wider uppercase ${
            lang === l ? 'bg-primary-container text-on-primary font-bold' : 'bg-surface-container-high text-on-surface hover:text-primary-container'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  )

  return (
    <div className="w-full min-h-screen bg-background text-on-surface font-body-md">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-surface-container-lowest border-b-2 border-on-surface">
        <div className="h-16 px-4 lg:px-12 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/#notes" className="font-label-code text-mono-md font-bold text-on-surface hover:text-primary-container">← ANA SAYFA</Link>
            <span className="font-label-code text-mono-md font-bold text-on-surface-variant hidden sm:inline">NOTLAR // 学習</span>
          </div>
          <div className="flex items-center gap-3">
            <LangToggle />
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

      <main className="p-6 lg:p-12">
        {/* --- NOT SECILI DEGIL: liste --- */}
        {!slug && (
          <>
            <h1 className="font-display-xl text-headline-lg lg:text-display-xl text-on-surface uppercase font-bold tracking-tight mb-2">
              {lang === 'tr' ? 'NOTLAR' : 'NOTES'}
            </h1>
            <p className="font-label-code text-mono-md text-on-surface-variant mb-8">
              {lang === 'tr' ? '// Öğrenme arşivi — giderek büyüyor' : '// Learning archive — ever growing'}
            </p>
            {list.length === 0 && <p className="font-label-code text-mono-md text-on-surface-variant">// {lang === 'tr' ? 'Henüz not yok.' : 'No notes yet.'}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {list.map((n, i) => (
                <Link
                  key={n.slug}
                  to={`/notlar/${n.slug}`}
                  className="block bg-surface-container border-2 border-on-surface p-5 hover:translate-x-[2px] hover:translate-y-[2px] transition-none"
                  style={{ boxShadow: `6px 6px 0px ${ACCENTS[i % ACCENTS.length]}` }}
                >
                  <span className="font-label-code text-label-code uppercase tracking-widest font-bold text-on-surface-variant">
                    {pick(n.category, lang)}
                  </span>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold uppercase mt-2 leading-tight">{pick(n.title, lang)}</h2>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* --- NOT SECILI: icerik --- */}
        {slug && (
          <>
            <Link to="/notlar" className="font-label-code text-mono-md text-on-surface-variant hover:text-primary-container">
              ← {lang === 'tr' ? 'tüm notlar' : 'all notes'}
            </Link>
            {loading && <p className="mt-4 font-label-code text-mono-md">{lang === 'tr' ? 'Yükleniyor...' : 'Loading...'}</p>}
            {notFound && <p className="mt-4 font-label-code text-mono-md text-primary-container">// {lang === 'tr' ? 'Not bulunamadı.' : 'Note not found.'}</p>}
            {note && (
              <>
                <div className="mt-4 mb-8 border-b-2 border-on-surface pb-6">
                  <span className="font-label-code text-label-code uppercase tracking-widest font-bold text-on-surface-variant">{pick(note.category, lang)}</span>
                  <h1 className="font-display-xl text-headline-lg lg:text-display-xl text-on-surface uppercase font-bold tracking-tight mt-2">{pick(note.title, lang)}</h1>
                </div>
                {/* tipe gore render — dil zaten burada cozuldu, renderer dilden habersiz */}
                {(() => {
                  const Renderer = RENDERERS[note.type]
                  if (!Renderer) {
                    return <p className="font-label-code text-mono-md text-on-surface-variant">// {lang === 'tr' ? 'Bu not tipi için henüz görünüm yok' : 'No view for this note type yet'}: {note.type}</p>
                  }
                  return <Renderer data={pick(note.data, lang)} />
                })()}
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default Notes
