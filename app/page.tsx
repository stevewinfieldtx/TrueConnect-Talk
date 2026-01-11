'use client'
import { useState } from 'react'
import axios from 'axios'

export default function Home() {
  const [roomCode, setRoomCode] = useState('')
  const [joined, setJoined] = useState(false)
  const [myText, setMyText] = useState('')
  const [messages, setMessages] = useState<string[]>([])
  const [myLang, setMyLang] = useState('en')
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!myText.trim() || loading) return
    setLoading(true)
    const label1 = myLang === 'en' ? 'You (EN): ' : 'You (VI): '
    setMessages(prev => [...prev, label1 + myText])
    try {
      const res = await axios.post('/api/translate', { type: 'text', content: myText, fromLang: myLang })
      const label2 = myLang === 'en' ? 'Translated (VI): ' : 'Translated (EN): '
      setMessages(prev => [...prev, label2 + res.data.translated])
    } catch (err) {
      setMessages(prev => [...prev, 'Error: Translation failed'])
    }
    setMyText('')
    setLoading(false)
  }

  if (!joined) {
    return (
      <main style={{ minHeight: '100vh', backgroundColor: '#111827', color: 'white', padding: 24 }}>
        <h1 style={{ fontSize: 30, textAlign: 'center', marginBottom: 24 }}>TrueConnect-Talk</h1>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <input type="text" placeholder="Enter room code" value={roomCode} onChange={e => setRoomCode(e.target.value)} style={{ backgroundColor: '#374151', padding: 12, borderRadius: 4, color: 'white', border: 'none' }} />
          <button onClick={() => setJoined(true)} style={{ backgroundColor: '#2563eb', padding: '12px 24px', borderRadius: 4, color: 'white', border: 'none', cursor: 'pointer' }}>Join</button>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#111827', color: 'white', padding: 24 }}>
      <h1 style={{ fontSize: 30, textAlign: 'center', marginBottom: 24 }}>TrueConnect-Talk</h1>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <span>Room: {roomCode} | </span>
        <label>Language: </label>
        <select value={myLang} onChange={e => setMyLang(e.target.value)} style={{ backgroundColor: '#374151', padding: 8, borderRadius: 4, color: 'white' }}>
          <option value="en">English</option>
          <option value="vi">Vietnamese</option>
        </select>
      </div>
      <div style={{ backgroundColor: '#374151', borderRadius: 8, padding: 16, minHeight: 300, marginBottom: 16 }}>
        {messages.map((m, i) => <p key={i} style={{ marginBottom: 8 }}>{m}</p>)}
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <input type="text" value={myText} onChange={e => setMyText(e.target.value)} placeholder="Type message..." onKeyDown={e => e.key === 'Enter' && handleSend()} disabled={loading} style={{ flex: 1, backgroundColor: '#374151', padding: 12, borderRadius: 4, color: 'white', border: 'none' }} />
        <button onClick={handleSend} disabled={loading} style={{ backgroundColor: '#16a34a', padding: '12px 24px', borderRadius: 4, color: 'white', border: 'none' }}>{loading ? '...' : 'Send'}</button>
      </div>
    </main>
  )
}
