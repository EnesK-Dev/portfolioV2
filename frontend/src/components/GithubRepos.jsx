import { useState, useEffect } from 'react'
import { API } from '../api.js'

// GitHub repolarini listeler + hangilerinin yayinlanacagini sectirir
function GithubRepos({ token }) {
  const [repos, setRepos] = useState([])          // GitHub'daki tum repolar
  const [selectedIds, setSelectedIds] = useState([]) // yayinlanacaklarin id'leri
  const [status, setStatus] = useState('Yukleniyor...')
  const [saveStatus, setSaveStatus] = useState('')

  useEffect(() => {
    // 1) GitHub'daki tum repolari cek
    fetch(`${API}/api/github/repos`)
      .then((res) => {
        if (!res.ok) throw new Error('alinamadi')
        return res.json()
      })
      .then((data) => {
        setRepos(data)
        setStatus('')
      })
      .catch(() => setStatus('GitHub repolari yuklenemedi.'))

    // 2) Daha once yayinlanmis olanlari cek -> kutulari onceden isaretle
    fetch(`${API}/api/github/featured`)
      .then((res) => res.json())
      .then((data) => setSelectedIds(data.map((r) => r.id)))
      .catch(() => {})
  }, [])

  // Bir repoyu sec/secimi kaldir
  function toggle(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  // Secilenleri kaydet (PUT)
  async function handleSave() {
    setSaveStatus('Kaydediliyor...')
    const selectedRepos = repos.filter((r) => selectedIds.includes(r.id))
    try {
      const res = await fetch(`${API}/api/github/featured`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(selectedRepos),
      })
      if (res.ok) setSaveStatus(`Kaydedildi! (${selectedRepos.length} repo yayinda)`)
      else if (res.status === 401) setSaveStatus('Token gecersiz. Tekrar giris yap.')
      else setSaveStatus('Kaydedilemedi.')
    } catch {
      setSaveStatus('Backend\'e ulasilamadi.')
    }
  }

  return (
    <div className="github-repos">
      <h2>GitHub Repolarim ({repos.length})</h2>
      <p className="hint">Yayinlamak istediklerini sec, sonra kaydet.</p>
      {status && <p className="status">{status}</p>}

      {repos.map((r) => (
        <div key={r.id} className="repo-card">
          <div className="repo-head">
            <label className="repo-select">
              <input
                type="checkbox"
                checked={selectedIds.includes(r.id)}
                onChange={() => toggle(r.id)}
              />
              <a href={r.url} target="_blank" rel="noreferrer">{r.name}</a>
            </label>
            <span className="repo-meta">
              {r.language && <span>{r.language}</span>}
              <span>★ {r.stars}</span>
            </span>
          </div>
          {r.desc && <p>{r.desc}</p>}
        </div>
      ))}

      {repos.length > 0 && (
        <div className="editor-actions">
          <button onClick={handleSave}>Yayindakileri Kaydet</button>
          {saveStatus && <span className="status">{saveStatus}</span>}
        </div>
      )}
    </div>
  )
}

export default GithubRepos
