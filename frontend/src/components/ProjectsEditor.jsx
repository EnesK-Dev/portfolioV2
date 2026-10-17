import { useState, useEffect } from 'react'

// token'i ust bilesenden (Admin) prop olarak alir
function ProjectsEditor({ token }) {
  const [projects, setProjects] = useState([])
  const [status, setStatus] = useState('')

  // mevcut projeleri yukle
  useEffect(() => {
    fetch('http://localhost:3001/api/projects')
      .then((res) => res.json())
      .then((data) => setProjects(data))
      .catch(() => {})
  }, [])

  // bir projenin bir alanini guncelle (map ile, immutable)
  function updateProject(index, key, value) {
    setProjects((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [key]: value } : p))
    )
  }

  // yeni bos proje ekle (spread ile)
  function addProject() {
    const newId = projects.length ? Math.max(...projects.map((p) => p.id)) + 1 : 1
    setProjects((prev) => [...prev, { id: newId, title: '', desc: '', tech: [] }])
  }

  // bir projeyi sil (filter ile)
  function removeProject(index) {
    setProjects((prev) => prev.filter((_, i) => i !== index))
  }

  // kaydet: korumali PUT + token
  async function handleSave() {
    setStatus('Kaydediliyor...')
    try {
      const res = await fetch('http://localhost:3001/api/projects', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(projects),
      })
      if (res.ok) setStatus('Kaydedildi!')
      else if (res.status === 401) setStatus('Token gecersiz, tekrar giris yap.')
      else setStatus('Kaydedilemedi.')
    } catch {
      setStatus('Backend\'e ulasilamadi.')
    }
  }

  return (
    <section>
      <h2>Projeleri Duzenle</h2>
      {projects.map((p, i) => (
        <div key={p.id} className="card edit-card">
          <label>Baslik</label>
          <input value={p.title} onChange={(e) => updateProject(i, 'title', e.target.value)} />

          <label>Aciklama</label>
          <textarea rows="3" value={p.desc} onChange={(e) => updateProject(i, 'desc', e.target.value)} />

          <label>Teknolojiler (virgulle ayir)</label>
          <input
            value={p.tech.join(', ')}
            onChange={(e) =>
              updateProject(
                i,
                'tech',
                e.target.value.split(',').map((t) => t.trim()).filter(Boolean)
              )
            }
          />

          <button type="button" className="danger" onClick={() => removeProject(i)}>Sil</button>
        </div>
      ))}

      <div className="editor-actions">
        <button type="button" onClick={addProject}>+ Yeni Proje</button>
        <button type="button" onClick={handleSave}>Projeleri Kaydet</button>
      </div>
      {status && <p className="status">{status}</p>}
    </section>
  )
}

export default ProjectsEditor
