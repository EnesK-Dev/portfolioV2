import { useState, useEffect } from 'react'
import { API } from '../api.js'

// Devam eden projeleri (ilerleme cubuklu) duzenler
function ProgressEditor({ token }) {
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('')

  useEffect(() => {
    fetch(`${API}/api/wip`)
      .then((res) => res.json())
      .then((data) => setItems(data))
      .catch(() => {})
  }, [])

  // bir alani guncelle (map ile, immutable)
  function updateItem(index, key, value) {
    setItems((prev) =>
      prev.map((w, i) => (i === index ? { ...w, [key]: value } : w))
    )
  }

  function addItem() {
    const newId = items.length ? Math.max(...items.map((w) => w.id)) + 1 : 1
    setItems((prev) => [...prev, { id: newId, title: '', note: '', progress: 0 }])
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setStatus('Kaydediliyor...')
    try {
      const res = await fetch(`${API}/api/wip`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(items),
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
      <h2>Devam Eden Projeler</h2>
      {items.map((w, i) => (
        <div key={w.id} className="card edit-card">
          <label>Baslik</label>
          <input value={w.title} onChange={(e) => updateItem(i, 'title', e.target.value)} />

          <label>Kisa not (opsiyonel)</label>
          <input value={w.note || ''} onChange={(e) => updateItem(i, 'note', e.target.value)} />

          <label>Ilerleme: {w.progress}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={w.progress}
            onChange={(e) => updateItem(i, 'progress', Number(e.target.value))}
          />
          {/* anlik onizleme cubugu */}
          <div className="bar">
            <div className="bar-fill" style={{ width: `${w.progress}%` }} />
          </div>

          <button type="button" className="danger" onClick={() => removeItem(i)}>Sil</button>
        </div>
      ))}

      <div className="editor-actions">
        <button type="button" onClick={addItem}>+ Yeni</button>
        <button type="button" onClick={handleSave}>Devam Edenleri Kaydet</button>
      </div>
      {status && <p className="status">{status}</p>}
    </section>
  )
}

export default ProgressEditor
