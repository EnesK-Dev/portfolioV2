import { useState, useEffect } from 'react'

import { API } from '../api.js'

// Basliktan URL-dostu slug uret (Turkce karakterleri sadelestir)
function slugify(s) {
  return s
    .toLowerCase()
    .replaceAll('ı', 'i').replaceAll('ş', 's').replaceAll('ğ', 'g')
    .replaceAll('ü', 'u').replaceAll('ö', 'o').replaceAll('ç', 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Deger {tr,en} ise bol, degilse (eski tek dil) tr'ye koy
function toLang(v) {
  if (v && typeof v === 'object') return { tr: v.tr || '', en: v.en || '' }
  return { tr: v || '', en: '' }
}

const NEW_DATA_TEMPLATE = '{\n  "tr": [],\n  "en": []\n}'

function NotesEditor({ token }) {
  const [list, setList] = useState([])
  const [editing, setEditing] = useState(null)
  const [status, setStatus] = useState('')

  function loadList() {
    fetch(`${API}/api/notes`).then((r) => r.json()).then(setList).catch(() => {})
  }
  useEffect(loadList, [])

  function updateField(key, value) {
    setEditing((prev) => ({ ...prev, [key]: value }))
  }

  function newNote() {
    setStatus('')
    setEditing({ slug: '', titleTr: '', titleEn: '', categoryTr: '', categoryEn: '', type: 'ports', dataText: NEW_DATA_TEMPLATE, isNew: true })
  }

  async function editNote(slug) {
    setStatus('')
    const r = await fetch(`${API}/api/notes/${slug}`)
    const n = await r.json()
    const t = toLang(n.title)
    const c = toLang(n.category)
    setEditing({
      slug: n.slug,
      titleTr: t.tr, titleEn: t.en,
      categoryTr: c.tr, categoryEn: c.en,
      type: n.type,
      dataText: JSON.stringify(n.data, null, 2),
      isNew: false,
    })
  }

  async function save() {
    let data
    try {
      data = JSON.parse(editing.dataText)
    } catch {
      setStatus('⚠ JSON hatalı — içeriği kontrol et.')
      return
    }
    const slug = (editing.slug || slugify(editing.titleTr || editing.titleEn)).trim()
    if (!editing.titleTr && !editing.titleEn) { setStatus('Başlık gerekli.'); return }
    if (!slug) { setStatus('Slug üretilemedi (başlığa İngilizce harf ekle).'); return }

    setStatus('Kaydediliyor...')
    const url = editing.isNew ? `${API}/api/notes` : `${API}/api/notes/${editing.slug}`
    const method = editing.isNew ? 'POST' : 'PUT'
    const body = JSON.stringify({
      slug,
      title: { tr: editing.titleTr, en: editing.titleEn },
      category: { tr: editing.categoryTr, en: editing.categoryEn },
      type: editing.type,
      data,
    })
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body,
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok) { setStatus('Kaydedildi!'); setEditing(null); loadList() }
      else if (res.status === 401) setStatus('Token geçersiz, tekrar giriş yap.')
      else setStatus(d.error || 'Kaydedilemedi.')
    } catch {
      setStatus('Backend\'e ulaşılamadı.')
    }
  }

  async function del(slug) {
    if (!window.confirm(`"${slug}" notunu silmek istediğine emin misin?`)) return
    await fetch(`${API}/api/notes/${slug}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (editing && editing.slug === slug) setEditing(null)
    loadList()
  }

  return (
    <section>
      <h2>Notları Düzenle</h2>

      {list.map((n) => (
        <div key={n.slug} className="card edit-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
            <div>
              <strong>{typeof n.title === 'object' ? (n.title.tr || n.title.en) : n.title}</strong>
              <div style={{ opacity: 0.6, fontSize: '0.8rem' }}>{n.type} · /{n.slug}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" onClick={() => editNote(n.slug)}>Düzenle</button>
              <button type="button" className="danger" onClick={() => del(n.slug)}>Sil</button>
            </div>
          </div>
        </div>
      ))}

      <div className="editor-actions">
        <button type="button" onClick={newNote}>+ Yeni Not</button>
      </div>

      {editing && (
        <div className="card edit-card">
          <h3>{editing.isNew ? 'Yeni Not' : `Düzenle: ${editing.slug}`}</h3>

          <label>Başlık (TR)</label>
          <input value={editing.titleTr} onChange={(e) => updateField('titleTr', e.target.value)} />
          <label>Title (EN)</label>
          <input value={editing.titleEn} onChange={(e) => updateField('titleEn', e.target.value)} />

          <label>Kategori (TR)</label>
          <input value={editing.categoryTr} onChange={(e) => updateField('categoryTr', e.target.value)} placeholder="ör. AĞ / SOC" />
          <label>Category (EN)</label>
          <input value={editing.categoryEn} onChange={(e) => updateField('categoryEn', e.target.value)} placeholder="e.g. NETWORK / SOC" />

          <label>Slug (URL — boş bırakırsan başlıktan üretilir)</label>
          <input value={editing.slug} onChange={(e) => updateField('slug', e.target.value)} placeholder="20-onemli-port" disabled={!editing.isNew} />

          <label>Tip</label>
          <select value={editing.type} onChange={(e) => updateField('type', e.target.value)}>
            <option value="ports">ports — port kartları [{`{name,port,full,desc,log}`}]</option>
            <option value="cheatsheet">cheatsheet — komut listesi [{`{cmd,desc}`}]</option>
            <option value="steps">steps — numaralı adımlar [{`{title,text}`}]</option>
            <option value="concept">concept — kavram anlatımı [{`{heading,body}`}]</option>
            <option value="grouped">grouped — renkli gruplu kutular [{`{group,items:[{code,name,desc}]}`}]</option>
          </select>

          <label>İçerik (JSON) — {`{ "tr": [...], "en": [...] }`} — Claude'un verdiğini yapıştır</label>
          <textarea
            rows="12"
            value={editing.dataText}
            onChange={(e) => updateField('dataText', e.target.value)}
            style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
          />

          <div className="editor-actions">
            <button type="button" onClick={save}>Kaydet</button>
            <button type="button" onClick={() => { setEditing(null); setStatus('') }}>Vazgeç</button>
          </div>
        </div>
      )}

      {status && <p className="status">{status}</p>}
    </section>
  )
}

export default NotesEditor
