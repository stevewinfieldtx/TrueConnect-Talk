'use client'
import { useState, useEffect, useRef } from 'react'
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
        const [messages, setMessages] = useState<Message[]>([])
        const [myLang, setMyLang] = useState('en')
        const [userId] = useState(() => Math.random().toString(36).substring(7))
        const [isLive, setIsLive] = useState(false)
        const [liveText, setLiveText] = useState('')

  const audioContextRef = useRef<AudioContext | null>(null)
        const socketRef = useRef<WebSocket | null>(null)
        const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
            if (!joined || !roomCode) return

                const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
                            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!
                })

                const channel = pusher.subscribe('room-' + roomCode)

                channel.bind('new-message', (data: Message) => {
                            setMessages(prev => [...prev, data])
                })

                return () => {
                            channel.unbind_all()
                            pusher.unsubscribe('room-' + roomCode)
                            pusher.disconnect()
                }
  }, [joined, roomCode])

  const startListening = async () => {
            try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                        streamRef.current = stream

              const tokenRes = await fetch('/api/deepgram-token')
                        const { token } = await tokenRes.json()

              if (!token) {
                            alert('Failed to get Deepgram token')
                            return
              }

              const lang = myLang === 'en' ? 'en-US' : 'vi'
                        const socket = new WebSocket(
                                      `wss://api.deepgram.com/v1/listen?language=${lang}&punctuate=true&interim_results=true`,
                                      ['token', token]
                                    )
                        socketRef.current = socket

              socket.onopen = () => {
                            const audioContext = new AudioContext({ sampleRate: 16000 })
                            audioContextRef.current = audioContext

                            const source = audioContext.createMediaStreamSource(stream)
                            const processor = audioContext.createScriptProcessor(4096, 1, 1)

                            processor.onaudioprocess = (e) => {
                                            if (socket.readyState === WebSocket.OPEN) {
                                                              const inputData = e.inputBuffer.getChannelData(0)
                                                              const pcmData = new Int16Array(inputData.length)
                                                              for (let i = 0; i < inputData.length; i++) {
                                                                                  pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768))
                                                              }
                                                              socket.send(pcmData.buffer)
                                            }
                            }

                            source.connect(processor)
                            processor.connect(audioContext.destination)
              }

              socket.onmessage = async (event) => {
                            const data = JSON.parse(event.data)
                            if (data.channel?.alternatives?.[0]?.transcript) {
                                            const transcript = data.channel.alternatives[0].transcript
                                            if (data.is_final && transcript.trim()) {
                                                              await fetch('/api/message', {
                                                                                  method: 'POST',
                                                                                  headers: { 'Content-Type': 'application/json' },
                                                                                  body: JSON.stringify({ roomCode, text: transcript, fromLang: myLang, sender: userId })
                                                              })
                                                              setLiveText('')
                                            } else {
                                                              setLiveText(transcript)
                                            }
                            }
              }

              socket.onerror = (err) => {
                            console.error('WebSocket error:', err)
              }

              setIsLive(true)
            } catch (err) {
                        alert('Microphone access denied or error occurred')
                        console.error(err)
            }
  }

  const stopListening = () => {
            streamRef.current?.getTracks().forEach(t => t.stop())
            socketRef.current?.close()
            audioContextRef.current?.close()
            setIsLive(false)
            setLiveText('')
  }

  if (!joined) return (
            <main style={{ minHeight: '100vh', backgroundColor: '#111827', color: 'white', padding: 24 }}>
                        <h1 style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>TrueConnect-Talk</h1}
                        <p style={{ textAlign: 'center', marginBottom: 24, color: '#9ca3af' }}>Real-time voice translation</p}
                        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                                      <input
                                                      placeholder="Room code"
                                                      value={roomCode}
                                                      onChange={e => setRoomCode(e.target.value)}
                                                      style={{ backgroundColor: '#374151', padding: 12, borderRadius: 8, color: 'white', border: 'none', fontSize: 16 }}
                                                    />
                                      <select
                                                      value={myLang}
                                                      onChange={e => setMyLang(e.target.value)}
                                                      style={{ backgroundColor: '#374151', padding: 12, borderRadius: 8, color: 'white', border: 'none', fontSize: 16 }}>
                                                      <option value="en">I speak English</option}
                                                <option value="vi">Tôi nói tiếng Việt</option}
                                      </select}
                                <button
                                                onClick={() => setJoined(true)}
                                                disabled={!roomCode.trim()}
                                                style={{ backgroundColor: '#2563eb', padding: '12px 24px', borderRadius: 8, color: 'white', border: 'none', fontSize: 16, cursor: 'pointer' }}>
                                          Join Room
                                </button>
                        </div>
            </main>
          )
        
          return (
            <main style={{ minHeight: '100vh', backgroundColor: '#111827', color: 'white', padding: 24 }}>
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                          <span style={{ fontSize: 18 }}>Room: <strong>{roomCode}</strong}</span}
                          <span style={{ marginLeft: 16 }}>Language: <strong>{myLang === 'en' ? 'English 🇺🇸' : 'Vietnamese 🇻🇳'}</strong}</span}
                  </div>
            
                  {liveText && (
                          <div style={{ backgroundColor: '#1e3a5f', padding: 16, borderRadius: 8, marginBottom: 16, textAlign: 'center' }}>
                                    <span style={{ color: '#9ca3af' }}>You&apos;re saying: </span}
                                    <span style={{ fontSize: 18 }}>{liveText}</span}
                          </div>
                  )}
            
                  <div style={{ backgroundColor: '#374151', borderRadius: 8, padding: 16, minHeight: 300, marginBottom: 16, overflowY: 'auto' }}>
                        {messages.length === 0 ? (
                            <p style={{ color: '#6b7280', textAlign: 'center', marginTop: 100 }}>
                                        Press the Talk button and speak. Your words will be translated in real-time!
                            </p}
                          ) : (
                            messages.map(m => (
                                              <div key={m.id} style={{ marginBottom: 16, padding: 12, backgroundColor: m.sender === userId ? '#1e3a5f' : '#4b5563', borderRadius: 8 }}>
                                                            <p style={{ fontSize: 18, marginBottom: 8 }}>
                                                                            <strong>{m.fromLang === 'en' ? '🇺🇸' : '🇻🇳'}</strong} {m.text}
                                                            </p}
                                                            <p style={{ color: '#9ca3af' }}>
                                                                            <strong>{m.fromLang === 'en' ? '🇻🇳' : '🇺🇸'}</strong} {m.translated}
                                                            </p}
                                              </div>
                                            ))
                          )}
                  </div>
            
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                        {!isLive ? (
                            <button
                                              onClick={startListening}
                                              style={{ backgroundColor: '#16a34a', padding: '20px 60px', borderRadius: 12, color: 'white', border: 'none', fontSize: 20, cursor: 'pointer' }}>
                                        🎤 Talk
                            </button>
                          ) : (
                            <button
                                              onClick={stopListening}
                                              style={{ backgroundColor: '#dc2626', padding: '20px 60px', borderRadius: 12, color: 'white', border: 'none', fontSize: 20, cursor: 'pointer', animation: 'pulse 1s infinite' }}>
                                        ⏹ Stop
                            </button>
                          )}
                  </div>
            
                  <style jsx>{`
                          @keyframes pulse {
                                    0%, 100% { opacity: 1; }
                                              50% { opacity: 0.7; }
                                                      }
                                                            `}</style>
            </main>
          )
}
