import { useState, useEffect } from 'react'
import '../App.css'
import ProjectsEditor from '../components/ProjectsEditor.jsx'
import MessagesList from '../components/MessagesList.jsx'
import GithubRepos from '../components/GithubRepos.jsx'
import ProgressEditor from '../components/ProgressEditor.jsx'

function Admin() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // Duzenlenecek icerik + kaydetme durumu
  const [content, setContent] = useState({ name: '', title: '', about: '', github: '', linkedin: '' })
  const [saveStatus, setSaveStatus] = useState('')

  // Giris yapilinca mevcut icerigi cek ve formu doldur
  useEffect(() => {
    if (!token) return
    fetch('http://localhost:3001/api/content')
      .then((res) => res.json())
      .then((data) => setContent(data))
      .catch(() => {})
  }, [token])

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch('http://localhost:3001/api/login', {
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
    setSaveStatus('Kaydediliyor...')
    try {
      const res = await fetch('http://localhost:3001/api/content', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(content),
      })
      if (res.ok) {
        setSaveStatus('Kaydedildi!')
      } else if (res.status === 401) {
        setSaveStatus('Token gecersiz/suresi doldu. Tekrar giris yap.')
      } else {
        setSaveStatus('Kaydedilemedi.')
      }
    } catch {
      setSaveStatus('Backend\'e ulasilamadi.')
    }
  }

  // --- Giris YAPILMADIYSA: login formu ---
  if (!token) {
    return (
      <div className="container">
        <h1>Admin Giris</h1>
        <form className="contact" onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Kullanici adi"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Sifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Giris Yap</button>
          {error && <p className="error">{error}</p>}
        </form>
      </div>
    )
  }

  // --- Giris YAPILDIYSA: icerik + proje duzenleme ---
  return (
    <div className="container">
      <header className="admin-header">
        <h1>Admin Panel</h1>
        <button onClick={handleLogout}>Cikis Yap</button>
      </header>

      <h2>Icerigi Duzenle</h2>
      <form className="contact" onSubmit={handleSave}>
        <label>Isim</label>
        <input
          type="text"
          value={content.name}
          onChange={(e) => updateField('name', e.target.value)}
        />

        <label>Baslik</label>
        <input
          type="text"
          value={content.title}
          onChange={(e) => updateField('title', e.target.value)}
        />

        <label>Hakkimda</label>
        <textarea
          rows="4"
          value={content.about}
          onChange={(e) => updateField('about', e.target.value)}
        />

        <label>GitHub linki</label>
        <input
          type="url"
          placeholder="https://github.com/kullaniciadi"
          value={content.github || ''}
          onChange={(e) => updateField('github', e.target.value)}
        />

        <label>LinkedIn linki</label>
        <input
          type="url"
          placeholder="https://linkedin.com/in/kullaniciadi"
          value={content.linkedin || ''}
          onChange={(e) => updateField('linkedin', e.target.value)}
        />

        <button type="submit">İçeriği Kaydet</button>
        {saveStatus && <p className="status">{saveStatus}</p>}
      </form>

      <ProjectsEditor token={token} />

      <ProgressEditor token={token} />

      <MessagesList token={token} />

      <GithubRepos token={token} />
    </div>
  )
}

export default Admin
