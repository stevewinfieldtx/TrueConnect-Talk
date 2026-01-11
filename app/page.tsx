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
        const originalMsg = (myLang === 'en' ? 'You (EN): ' : 'You (VI): ') + myText
        setMessages(prev => [...prev, originalMsg])

        try {
                const res = await axios.post('/api/translate', {
                          type: 'text',
                          content: myText,
                          fromLang: myLang
                })
                const translatedMsg = (myLang === 'en' ? 'Translated (VI): ' : 'Translated (EN): ') + res.data.translated
                setMessages(prev => [...prev, translatedMsg])
        } catch (err) {
                setMessages(prev => [...prev, 'Error: Translation failed'])
        }
        setMyText('')
        setLoading(false)
  }

  return (
        <main style={{ minHeight: '100vh', backgroundColor: '#111827', color: 'white', padding: 24 }}>
                <h1 style={{ fontSize: 30, textAlign: 'center', marginBottom: 24 }}>TrueConnect-Talk</h1>h1>
          {!joined ? (
                  <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                              <input type="text" placeholder="Enter room code" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} style={{ backgroundColor: '#374151', padding: 12, borderRadius: 4, color: 'white', border: 'none' }} />
                              <button onClick={() => setJoined(true)} style={{ backgroundColor: '#2563eb', padding: '12px 24px', borderRadius: 4, color: 'white', border: 'none', cursor: 'pointer' }}>Join</button>button>
                  </div>div>
                ) : (
                  <div>
                            <div style={{ textAlign: 'center', marginBottom: 16 }}>
                                        <p>Room: {roomCode}</p>p>
                                        <label>My Language: </label>label>
                                        <select value={myLang} onChange={(e) => setMyLang(e.target.value)} style={{ backgroundColor: '#374151', padding: 8, borderRadius: 4, color: 'white', marginLeft: 8 }}>
                                                      <option value="en">English</option>option>
                                                      <option value="vi">Vietnamese</option>option>
                                        </select>select>
                            </div>div>
                            <div style={{ backgroundColor: '#374151', borderRadius: 8, padding: 16, minHeight: 300, marginBottom: 16, overflowY: 'auto' }}>
                              {messages.map((m, i) => (<p key={i} style={{ marginBottom: 8 }}>{m}</p>p>))}
                            </div>div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                        <input type="text" value={myText} onChange={(e) => setMyText(e.target.value)} placeholder="Type message..." style={{ flex: 1, backgroundColor: '#374151', padding: 12, borderRadius: 4, color: 'white', border: 'none' }} onKeyDown={(e) => e.key === 'Enter' && handleSend()} disabled={loading} />
                                        <button onClick={handleSend} disabled={loading} style={{ backgroundColor: loading ? '#6b7280' : '#16a34a', padding: '12px 24px', borderRadius: 4, color: 'white', border: 'none', cursor: loading ? 'wait' : 'pointer' }}>{loading ? '...' : 'Send'}</button>button>
                            </div>div>
                  </div>div>
              )}
        </main>main>
      )
}</div>
