import { useState, useEffect } from 'react'
import { API } from '../api.js'

// token'i ust bilesenden (Admin) prop olarak alir
function ProjectsEditor({ token }) {
  const [projects, setProjects] = useState([])
  const [status, setStatus] = useState('')

  // mevcut projeleri yukle
  useEffect(() => {
    fetch(`${API}/api/projects`)
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

  // secilen gorseli yukle -> donen url'yi o projenin image alanina yaz
  async function uploadImage(index, file) {
    if (!file) return
    const formData = new FormData()     // dosya tasiyan ozel kap
    formData.append('image', file)      // backend'de upload.single('image') ile eslesir
    setStatus('Gorsel yukleniyor...')
    try {
      const res = await fetch(`${API}/api/upload`, {
        method: 'POST',
        // DIKKAT: Content-Type ELLE verilmez! FormData'da tarayici
        // multipart sinirini kendi ekler; elle yazarsak upload bozulur.
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (res.ok) {
        updateProject(index, 'image', data.url)
        setStatus('Gorsel yuklendi.')
      } else {
        setStatus(data.error || 'Gorsel yuklenemedi.')
      }
    } catch {
      setStatus('Gorsel yuklenemedi.')
    }
  }

  // kaydet: korumali PUT + token
  async function handleSave() {
    setStatus('Kaydediliyor...')
    try {
      const res = await fetch(`${API}/api/projects`, {
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

          <label>Gorsel</label>
          {p.image && (
            <img
              className="edit-preview"
              src={`${API}${p.image}`}
              alt="onizleme"
            />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => uploadImage(i, e.target.files[0])}
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
