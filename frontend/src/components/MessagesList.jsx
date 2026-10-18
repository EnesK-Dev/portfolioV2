import { useState, useEffect } from 'react'

// Gelen iletisim mesajlarini gosterir (korumali GET /api/messages)
function MessagesList({ token }) {
  const [messages, setMessages] = useState([])
  const [error, setError] = useState('')

  // Bilesen acilinca mesajlari cek
  useEffect(() => {
    fetch('http://localhost:3001/api/messages', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Mesajlar alinamadi')
        return res.json()
      })
      .then((data) => setMessages(data))
      .catch(() => setError('Mesajlar yuklenemedi.'))
  }, [token])

  return (
    <div className="messages">
      <h2>Gelen Mesajlar ({messages.length})</h2>
      {error && <p className="error">{error}</p>}
      {messages.length === 0 && !error && <p>Henuz mesaj yok.</p>}

      {messages.map((m) => (
        <div key={m.id} className="message-card">
          <div className="message-head">
            <strong>{m.name}</strong>
            <span className="message-date">{m.created_at}</span>
          </div>
          <p>{m.message}</p>
        </div>
      ))}
    </div>
  )
}

export default MessagesList
