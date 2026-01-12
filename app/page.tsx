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
    audioUrl?: string
}

export default function Home() {
    const [roomCode, setRoomCode] = useState('')
    const [joined, setJoined] = useState(false)
    const [myText, setMyText] = useState('')
    const [messages, setMessages] = useState<Message[]>([])
    const [myLang, setMyLang] = useState('en')
    const [loading, setLoading] = useState(false)
    const [userId] = useState(() => Math.random().toString(36).substring(7))
    const [isRecording, setIsRecording] = useState(false)
    const [gender, setGender] = useState('male')
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
        if (!joined || !roomCode) return
        const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
                cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!
        })
        const channel = pusher.subscribe('room-' + roomCode)
        channel.bind('new-message', (data: Message) => {
                setMessages(prev => [...prev, data])
                if (data.sender !== userId && data.audioUrl) {
                          const audio = new Audio(data.audioUrl)
                          audio.play().catch(() => {})
                }
        })
        return () => {
                channel.unbind_all()
                pusher.unsubscribe('room-' + roomCode)
                pusher.disconnect()
        }
  }, [joined, roomCode, userId])

  const startRecording = async () => {
        try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                const mediaRecorder = new MediaRecorder(stream)
                mediaRecorderRef.current = mediaRecorder
                chunksRef.current = []
                        mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data)
                mediaRecorder.onstop = async () => {
                          const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
                          stream.getTracks().forEach(t => t.stop())
                          await sendAudio(blob)
                }
                mediaRecorder.start()
                setIsRecording(true)
        } catch (err) {
                alert('Microphone access denied')
        }
  }

  const stopRecording = () => {
        if (mediaRecorderRef.current) {
                mediaRecorderRef.current.stop()
                setIsRecording(false)
        }
  }

  const sendAudio = async (blob: Blob) => {
        setLoading(true)
        try {
                const formData = new FormData()
                formData.append('audio', blob, 'recording.webm')
                formData.append('roomCode', roomCode)
                formData.append('fromLang', myLang)
                formData.append('sender', userId)
                formData.append('gender', gender)
                await axios.post('/api/voice', formData)
        } catch (err) {
                console.error('Failed to send audio')
        }
        setLoading(false)
  }

  const handleSend = async () => {
        if (!myText.trim() || loading) return
        setLoading(true)
        try {
                await axios.post('/api/message', { roomCode, text: myText, fromLang: myLang, sender: userId, gender })
        } catch (err) {
                console.error('Failed to send message')
        }
        setMyText('')
        setLoading(false)
  }

  if (!joined) {
        return (
                <main style={{ minHeight: '100vh', backgroundColor: '#111827', color: 'white', padding: 24 }}>
                          <h1 style={{ fontSize: 30, textAlign: 'center', marginBottom: 24 }}>TrueConnect-Talk</h1>h1>
                          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                                      <input type="text" placeholder="Enter room code" value={roomCode} onChange={e => setRoomCode(e.target.value)} style={{ backgroundColor: '#374151', padding: 12, borderRadius: 4, color: 'white', border: 'none' }} />
                                      <button onClick={() => setJoined(true)} disabled={!roomCode.trim()} style={{ backgroundColor: '#2563eb', padding: '12px 24px', borderRadius: 4, color: 'white', border: 'none', cursor: 'pointer' }}>Join</button>button>
                          </div>div>
                </main>main>
              )
  }

  return (
        <main style={{ minHeight: '100vh', backgroundColor: '#111827', color: 'white', padding: 24 }}>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                          <span>Room: {roomCode} | </span>span>
                        <label>Language: </label>label>
                        <select value={myLang} onChange={e => setMyLang(e.target.value)} style={{ backgroundColor: '#374151', padding: 8, borderRadius: 4, color: 'white', marginRight: 12 }}>
                                  <option value="en">English</option>option>
                                  <option value="vi">Vietnamese</option>option>
                        </select>select>
                        <label>Voice: </label>label>
                        <select value={gender} onChange={e => setGender(e.target.value)} style={{ backgroundColor: '#374151', padding: 8, borderRadius: 4, color: 'white' }}>
                                  <option value="male">Male</option>option>
                                  <option value="female">Female</option>option>
                        </select>select>
                </div>div>
              <div style={{ backgroundColor: '#374151', borderRadius: 8, padding: 16, minHeight: 300, marginBottom: 16, overflowY: 'auto' }}>
                {messages.map((m) => (
                    <div key={m.id} style={{ marginBottom: 12, padding: 8, backgroundColor: m.sender === userId ? '#1e3a5f' : '#4b5563', borderRadius: 4 }}>
                                <p style={{ marginBottom: 4 }}><strong>{m.fromLang === 'en' ? 'EN' : 'VI'}:</strong>strong> {m.text}</p>p>
                                <p style={{ color: '#9ca3af' }}><strong>{m.fromLang === 'en' ? 'VI' : 'EN'}:</strong>strong> {m.translated}</p>p>
                    </div>div>
                  ))}
              </div>div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <button onClick={isRecording ? stopRecording : startRecording} disabled={loading} style={{ backgroundColor: isRecording ? '#dc2626' : '#7c3aed', padding: '12px 24px', borderRadius: 4, color: 'white', border: 'none' }}>{isRecording ? 'Stop' : 'Speak'}</button>button>
                      <input type="text" value={myText} onChange={e => setMyText(e.target.value)} placeholder="Or type..." onKeyDown={e => e.key === 'Enter' && handleSend()} disabled={loading} style={{ flex: 1, backgroundColor: '#374151', padding: 12, borderRadius: 4, color: 'white', border: 'none', minWidth: 150 }} />
                      <button onClick={handleSend} disabled={loading} style={{ backgroundColor: '#16a34a', padding: '12px 24px', borderRadius: 4, color: 'white', border: 'none' }}>{loading ? '...' : 'Send'}</button>button>
              </div>div>
        </main>main>
      )
}</span>
