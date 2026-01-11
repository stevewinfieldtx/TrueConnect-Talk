'use client'
import { useState } from 'react'

export default function Home() {
  const [roomCode, setRoomCode] = useState('')
  const [joined, setJoined] = useState(false)
  const [myText, setMyText] = useState('')
  const [messages, setMessages] = useState<string[]>([])

  const handleSend = () => {
    if (myText.trim()) {
      setMessages(prev => [...prev, myText])
      setMyText('')
    }
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#111827', color: 'white', padding: 24 }}>
      <h1 style={{ fontSize: 30, textAlign: 'center', marginBottom: 24 }}>TrueConnect-Talk</h1>
      {!joined ? (
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <input type="text" placeholder="Enter room code" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} style={{ backgroundColor: '#374151', padding: 12, borderRadius: 4, color: 'white', border: 'none' }} />
          <button onClick={() => setJoined(true)} style={{ backgroundColor: '#2563eb', padding: '12px 24px', borderRadius: 4, color: 'white', border: 'none', cursor: 'pointer' }}>Join</button>
        </div>
      ) : (
        <div>
          <p style={{ textAlign: 'center', marginBottom: 16 }}>Room: {roomCode}</p>
          <div style={{ backgroundColor: '#374151', borderRadius: 8, padding: 16, minHeight: 200, marginBottom: 16 }}>
            {messages.map((m, i) => (<p key={i}>{m}</p>))}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <input type="text" value={myText} onChange={(e) => setMyText(e.target.value)} placeholder="Type message..." style={{ flex: 1, backgroundColor: '#374151', padding: 12, borderRadius: 4, color: 'white', border: 'none' }} />
            <button onClick={handleSend} style={{ backgroundColor: '#16a34a', padding: '12px 24px', borderRadius: 4, color: 'white', border: 'none', cursor: 'pointer' }}>Send</button>
          </div>
        </div>
      )}
    </main>
  )
}
