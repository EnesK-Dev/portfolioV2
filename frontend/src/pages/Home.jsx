import { useState, useEffect } from 'react'
import '../App.css'

// Home = herkese acik ana site (eski App icerigi buraya tasindi)
function Home() {
  const [content, setContent] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    fetch('http://localhost:3001/api/content')
      .then((res) => res.json())
      .then((data) => setContent(data))
      .catch(() => {})

    fetch('http://localhost:3001/api/projects')
      .then((res) => res.json())
      .then((data) => {
        setProjects(data)
        setLoading(false)
      })
      .catch(() => {
        setError('Backend\'e ulasilamadi. (backend calisiyor mu?)')
        setLoading(false)
      })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('Gonderiliyor...')
    try {
      const res = await fetch('http://localhost:3001/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message }),
      })
      const data = await res.json()
      if (data.ok) {
        setStatus('Mesajin gonderildi!')
        setName('')
        setMessage('')
      }
    } catch {
      setStatus('Gonderilemedi. Backend calisiyor mu?')
    }
  }

  return (
    <div className="container">
      <header>
        <h1>{content?.name}</h1>
        <p className="subtitle">{content?.title}</p>
      </header>

      {content?.about && <p className="about">{content.about}</p>}

      <h2>Projeler</h2>
      {loading && <p>Yukleniyor...</p>}
      {error && <p className="error">{error}</p>}
      <div className="projects">
        {projects.map((p) => (
          <article key={p.id} className="card">
            <h3>{p.title}</h3>
            <p>{p.desc}</p>
            <div className="tags">
              {p.tech.map((t) => (
                <span key={t} className="tag">{t}</span>
              ))}
            </div>
          </article>
        ))}
      </div>

      <h2 className="contact-title">İletişim</h2>
      <form className="contact" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Adın"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <textarea
          placeholder="Mesajın"
          rows="4"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
        <button type="submit">Gönder</button>
        {status && <p className="status">{status}</p>}
      </form>
    </div>
  )
}

export default Home
