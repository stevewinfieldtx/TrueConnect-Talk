'use client'
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import Pusher from 'pusher-js'

interface Message {
  id: string
  text: string
  translated: string
  fromLang: string
  sender: string
}

export default function Home() {
  const [roomCode, setRoomCode] = useState('')
  const [joined, setJoined] = useState(false)
  const [myText, setMyText] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [myLang, setMyLang] = useState('en')
  const [loading, setLoading] = useState(false)
  const [userId] = useState(() => Math.random().toString(36).substring(7))
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [voiceGender, setVoiceGender] = useState('male')
  const voiceEnabledRef = useRef(voiceEnabled)
  const voiceGenderRef = useRef(voiceGender)
  const myLangRef = useRef(myLang)

  // Keep refs in sync
  useEffect(() => { voiceEnabledRef.current = voiceEnabled }, [voiceEnabled])
  useEffect(() => { voiceGenderRef.current = voiceGender }, [voiceGender])
  useEffect(() => { myLangRef.current = myLang }, [myLang])

  useEffect(() => {
    if (!joined || !roomCode) return
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER! })
    const channel = pusher.subscribe('room-' + roomCode)
    channel.bind('new-message', async (data: Message) => {
      setMessages(prev => [...prev, data])
      // If voice enabled and message is from someone else, speak the translation
      if (voiceEnabledRef.current && data.sender !== userId) {
        const textToSpeak = data.fromLang === myLangRef.current ? data.translated : data.text
        try {
          const res = await axios.post('/api/tts', { text: textToSpeak, gender: voiceGenderRef.current })
          if (res.data.audioUrl) {
            new Audio(res.data.audioUrl).play().catch(() => {})
          }
        } catch {}
      }
    })
    return () => { channel.unbind_all(); pusher.unsubscribe('room-' + roomCode); pusher.disconnect() }
  }, [joined, roomCode, userId])

  const handleSend = async () => {
    if (!myText.trim() || loading) return
    setLoading(true)
    await axios.post('/api/message', { roomCode, text: myText, fromLang: myLang, sender: userId }).catch(() => {})
    setMyText('')
    setLoading(false)
  }

  if (!joined) return (
    <main style={{ minHeight: '100vh', backgroundColor: '#111827', color: 'white', padding: 24 }}>
      <h1 style={{ fontSize: 30, textAlign: 'center', marginBottom: 24 }}>TrueConnect-Talk</h1>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
        <input placeholder="Room code" value={roomCode} onChange={e => setRoomCode(e.target.value)} style={{ backgroundColor: '#374151', padding: 12, borderRadius: 4, color: 'white', border: 'none' }} />
        <button onClick={() => setJoined(true)} disabled={!roomCode.trim()} style={{ backgroundColor: '#2563eb', padding: '12px 24px', borderRadius: 4, color: 'white', border: 'none' }}>Join</button>
      </div>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#111827', color: 'white', padding: 24 }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        Room: {roomCode} | Lang: <select value={myLang} onChange={e => setMyLang(e.target.value)} style={{ backgroundColor: '#374151', padding: 8, borderRadius: 4, color: 'white' }}><option value="en">English</option><option value="vi">Vietnamese</option></select>
        {' '}
        <label style={{ marginLeft: 16, cursor: 'pointer' }}>
          <input type="checkbox" checked={voiceEnabled} onChange={e => setVoiceEnabled(e.target.checked)} style={{ marginRight: 6 }} />
          🔊 Voice
        </label>
        {voiceEnabled && (
          <select value={voiceGender} onChange={e => setVoiceGender(e.target.value)} style={{ backgroundColor: '#374151', padding: 8, borderRadius: 4, color: 'white', marginLeft: 8 }}>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        )}
      </div>
      <div style={{ backgroundColor: '#374151', borderRadius: 8, padding: 16, minHeight: 300, marginBottom: 16 }}>
        {messages.map(m => (
          <div key={m.id} style={{ marginBottom: 12, padding: 8, backgroundColor: m.sender === userId ? '#1e3a5f' : '#4b5563', borderRadius: 4 }}>
            <p><strong>{m.fromLang === 'en' ? 'EN' : 'VI'}:</strong> {m.text}</p>
            <p style={{ color: '#9ca3af' }}><strong>{m.fromLang === 'en' ? 'VI' : 'EN'}:</strong> {m.translated}</p>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <input value={myText} onChange={e => setMyText(e.target.value)} placeholder="Type message..." onKeyDown={e => e.key === 'Enter' && handleSend()} style={{ flex: 1, backgroundColor: '#374151', padding: 12, borderRadius: 4, color: 'white', border: 'none' }} />
        <button onClick={handleSend} disabled={loading} style={{ backgroundColor: '#16a34a', padding: '12px 24px', borderRadius: 4, color: 'white', border: 'none' }}>{loading ? '...' : 'Send'}</button>
      </div>
    </main>
  )
}
