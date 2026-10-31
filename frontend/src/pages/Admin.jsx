import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import '../App.css'
import ProjectsEditor from '../components/ProjectsEditor.jsx'
import MessagesList from '../components/MessagesList.jsx'
import GithubRepos from '../components/GithubRepos.jsx'
import ProgressEditor from '../components/ProgressEditor.jsx'
import NotesEditor from '../components/NotesEditor.jsx'

import { API } from '../api.js'

function Admin() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // Duzenlenecek icerik + kaydetme durumu
  const [content, setContent] = useState({ name: '', title: '', about: '', github: '', linkedin: '' })
  const [saveStatus, setSaveStatus] = useState('')

  // Tema: ana sitedeki tercihi takip et (localStorage.theme), <html>'e light/dark bas
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('theme') || 'light' } catch { return 'light' }
  })
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('light', theme === 'light')
    root.classList.toggle('dark', theme !== 'light')
    try { localStorage.setItem('theme', theme) } catch {}
  }, [theme])

  // Giris yapilinca mevcut icerigi cek ve formu doldur
  useEffect(() => {
    if (!token) return
    fetch(`${API}/api/content`)
      .then((res) => res.json())
      .then((data) => setContent(data))
      .catch(() => {})
  }, [token])

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch(`${API}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (data.token) {
        localStorage.setItem('token', data.token)
        setToken(data.token)
      } else {
        setError(data.error || 'Giris basarisiz')
      }
    } catch {
      setError('Backend\'e ulasilamadi.')
    }
  }

  function handleLogout() {
    localStorage.removeItem('token')
    setToken('')
  }

  function updateField(key, value) {
    setContent((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaveStatus('> KAYDEDILIYOR...')
    try {
      const res = await fetch(`${API}/api/content`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(content),
      })
      if (res.ok) {
        setSaveStatus('> KAYDEDILDI ✓')
      } else if (res.status === 401) {
        setSaveStatus('> TOKEN GECERSIZ — TEKRAR GIRIS YAP')
      } else {
        setSaveStatus('> KAYDEDILEMEDI')
      }
    } catch {
      setSaveStatus('> BACKEND YANIT VERMIYOR')
    }
  }

  // --- Ortak kucuk parcalar ---
  const ThemeToggle = () => (
    <button
      type="button"
      onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
      className="font-label-code text-label-code bg-surface-container-high px-2 py-1 border border-on-surface text-on-surface hover:text-primary-container tracking-wider"
      aria-label="Tema degistir"
    >
      {theme === 'light' ? 'KOYU ☾' : 'AÇIK ☀'}
    </button>
  )

  const labelCls = 'font-label-code text-label-code text-on-surface-variant uppercase tracking-wider'
  const inputCls =
    'w-full bg-surface border-2 border-surface-variant focus:border-primary-container focus:outline-none px-4 py-3 font-label-code text-mono-md text-on-surface'
  const btnPrimary =
    'px-6 py-3 bg-primary-container text-on-primary font-label-code text-mono-md font-bold tracking-wider border-2 border-on-surface shadow-[4px_4px_0px_#324879] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#324879] transition-none uppercase'

  // Alt editorleri saran temali cerceve (ic kisim kendi bileseninin isi)
  const Panel = ({ title, jp, children }) => (
    <section className="border-2 border-on-surface bg-surface-container-lowest">
      <div className="border-b-2 border-on-surface bg-surface-container-low px-5 py-3 flex items-center justify-between">
        <h2 className="font-label-code text-mono-md font-bold uppercase tracking-wider text-on-surface">{title}</h2>
        {jp && <span className="font-label-code text-label-code text-on-surface-variant">{jp}</span>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )

  // --- Giris YAPILMADIYSA: login paneli ---
  if (!token) {
    return (
      <div className="w-full min-h-screen bg-background text-on-surface font-body-md flex items-center justify-center p-6 wave-bg">
        <div className="w-full max-w-md bg-surface-container border-2 border-on-surface shadow-[8px_8px_0px_#ff5541]">
          <div className="border-b-2 border-on-surface bg-surface-container-lowest px-5 py-3 flex items-center justify-between">
            <span className="font-label-code text-mono-md font-bold tracking-tight text-on-surface">ENES.DEV // 管理</span>
            <span className="border-2 border-primary-container text-primary-container font-label-code text-label-code px-1.5 py-0.5 font-bold">[ADMIN]</span>
          </div>
          <form className="p-6 space-y-4" onSubmit={handleLogin}>
            <h1 className="font-headline-sm text-headline-sm text-on-surface font-bold uppercase">Admin Giriş</h1>
            <div className="space-y-1.5">
              <label className={labelCls}>&gt; kullanıcı adı</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>&gt; şifre</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={inputCls}
              />
            </div>
            <button type="submit" className={`${btnPrimary} w-full justify-center`}>GİRİŞ YAP →</button>
            {error && <p className="font-label-code text-mono-md text-primary-container">// {error}</p>}
            <Link to="/" className="block font-label-code text-label-code text-on-surface-variant hover:text-primary-container tracking-wider">← SİTEYE DÖN</Link>
          </form>
        </div>
      </div>
    )
  }

  // --- Giris YAPILDIYSA: admin paneli ---
  return (
    <div className="w-full min-h-screen bg-background text-on-surface font-body-md">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-surface-container-lowest border-b-2 border-on-surface">
        <div className="h-16 px-4 lg:px-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-label-code text-mono-md font-bold tracking-tight text-on-surface">ENES.DEV // 管理</span>
            <span className="border-2 border-primary-container text-primary-container font-label-code text-label-code px-1.5 py-0.5 font-bold hidden sm:inline">[ADMIN]</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/" className="font-label-code text-label-code bg-surface-container-high px-2 py-1 border border-on-surface text-on-surface hover:text-primary-container tracking-wider">SİTE ↗</Link>
            <button
              onClick={handleLogout}
              className="font-label-code text-label-code bg-surface-container-high px-2 py-1 border border-on-surface text-on-surface hover:text-primary-container tracking-wider"
            >
              ÇIKIŞ ⏻
            </button>
          </div>
        </div>
      </header>

      <main className="p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
        {/* ICERIK DUZENLE */}
        <Panel title="İÇERİK" jp="[プロフィール]">
          <form className="space-y-4" onSubmit={handleSave}>
            <div className="space-y-1.5">
              <label className={labelCls}>&gt; isim</label>
              <input type="text" value={content.name} onChange={(e) => updateField('name', e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>&gt; başlık</label>
              <input type="text" value={content.title} onChange={(e) => updateField('title', e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>&gt; hakkımda</label>
              <textarea rows="4" value={content.about} onChange={(e) => updateField('about', e.target.value)} className={`${inputCls} resize-none`} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>&gt; github linki</label>
              <input type="url" placeholder="https://github.com/kullaniciadi" value={content.github || ''} onChange={(e) => updateField('github', e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>&gt; linkedin linki</label>
              <input type="url" placeholder="https://linkedin.com/in/kullaniciadi" value={content.linkedin || ''} onChange={(e) => updateField('linkedin', e.target.value)} className={inputCls} />
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <button type="submit" className={btnPrimary}>İÇERİĞİ KAYDET →</button>
              {saveStatus && <p className="font-label-code text-mono-md text-primary-container">{saveStatus}</p>}
            </div>
          </form>
        </Panel>

        {/* ALT EDITORLER — temali cerceve icinde */}
        <Panel title="PROJELER" jp="[成果物]"><ProjectsEditor token={token} /></Panel>
        <Panel title="DEVAM EDENLER" jp="[進行中]"><ProgressEditor token={token} /></Panel>
        <Panel title="NOTLAR" jp="[学習]"><NotesEditor token={token} /></Panel>
        <Panel title="MESAJLAR" jp="[連絡]"><MessagesList token={token} /></Panel>
        <Panel title="GITHUB" jp="[リポジトリ]"><GithubRepos token={token} /></Panel>
      </main>
    </div>
  )
}

export default Admin
