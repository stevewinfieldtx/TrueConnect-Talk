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

  const localStreamRef = useRef<MediaStream | null>(null)
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const socketRef = useRef<WebSocket | null>(null)
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
        if (!joined || !roomCode) return

                const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
                        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!
                })

                const channel = pusher.subscribe('room-' + roomCode)

                channel.bind('new-message', (data: Message) => {
                        setMessages(prev => [...prev, data])
                })

                channel.bind('webrtc-signal', async (data: { sender: string, type: string, payload: string }) => {
                        if (data.sender === userId) return

                                   const signal = JSON.parse(data.payload)

                                   if (data.type === 'offer') {
                                             await handleOffer(signal)
                                   } else if (data.type === 'answer') {
                                             await peerConnectionRef.current?.setRemoteDescription(signal)
                                   } else if (data.type === 'ice-candidate') {
                                             await peerConnectionRef.current?.addIceCandidate(signal)
                                   }
                })

                return () => {
                        channel.unbind_all()
                        pusher.unsubscribe('room-' + roomCode)
                        pusher.disconnect()
                }
  }, [joined, roomCode, userId])

  const sendSignal = async (type: string, payload: object) => {
        await fetch('/api/signal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomCode, sender: userId, type, payload: JSON.stringify(payload) })
        })
  }

  const setupPeerConnection = () => {
        const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        })

        pc.onicecandidate = (e) => {
                if (e.candidate) {
                          sendSignal('ice-candidate', e.candidate)
                }
        }

        pc.ontrack = (e) => {
                if (remoteAudioRef.current) {
                          remoteAudioRef.current.srcObject = e.streams[0]
                          remoteAudioRef.current.play().catch(() => {})
                }
        }

        peerConnectionRef.current = pc
        return pc
  }

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
        const pc = setupPeerConnection()

        if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => {
                          pc.addTrack(track, localStreamRef.current!)
                })
        }

        await pc.setRemoteDescription(offer)
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        sendSignal('answer', answer)
                    }

    const startCall = async () => {
          try {
                  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                  localStreamRef.current = stream

            const pc = setupPeerConnection()
                  stream.getTracks().forEach(track => pc.addTrack(track, stream))

            startTranscription(stream)

            const offer = await pc.createOffer()
                  await pc.setLocalDescription(offer)
                  sendSignal('offer', offer)

            setIsLive(true)
          } catch (err) {
                  alert('Microphone access denied')
          }
    }

  const startTranscription = async (stream: MediaStream) => {
        const tokenRes = await fetch('/api/deepgram-token')
        const { token } = await tokenRes.json()

        const socket = new WebSocket(
                `wss://api.deepgram.com/v1/listen?language=${myLang === 'en' ? 'en' : 'vi'}&punctuate=true&interim_results=true`,
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
                                            body: JSON.stringify({
                                                            roomCode,
                                                            text: transcript,
                                                            fromLang: myLang,
                                                            sender: userId
                                            })
                              })
                              setLiveText('')
                  } else {
                              setLiveText(transcript)
                  }
                }
        }
  }

  const endCall = () => {
        localStreamRef.current?.getTracks().forEach(t => t.stop())
        peerConnectionRef.current?.close()
        socketRef.current?.close()
        audioContextRef.current?.close()
        setIsLive(false)
        setLiveText('')
  }

  if (!joined) return (
        <main style={{ minHeight: '100vh', backgroundColor: '#111827', color: 'white', padding: 24 }}>
                <h1 style={{ fontSize: 30, textAlign: 'center', marginBottom: 24 }}>TrueConnect-Talk</h1>h1>
                <p style={{ textAlign: 'center', marginBottom: 24, color: '#9ca3af' }}>Real-time voice translation</p>p>
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                          <input placeholder="Room code" value={roomCode} onChange={e => setRoomCode(e.target.value)} style={{ backgroundColor: '#374151', padding: 12, borderRadius: 4, color: 'white', border: 'none' }} />
                          <select value={myLang} onChange={e => setMyLang(e.target.value)} style={{ backgroundColor: '#374151', padding: 12, borderRadius: 4, color: 'white', border: 'none' }}>
                                      <option value="en">I speak English</option>option>
                                    <option value="vi">Tôi nói tiếng Việt</option>option>
                          </select>select>
                        <button onClick={() => setJoined(true)} disabled={!roomCode.trim()} style={{ backgroundColor: '#2563eb', padding: '12px 24px', borderRadius: 4, color: 'white', border: 'none' }}>Join</button>button>
                </div>div>
        </main>main>
      )
    
      return (
        <main style={{ minHeight: '100vh', backgroundColor: '#111827', color: 'white', padding: 24 }}>
              <audio ref={remoteAudioRef} autoPlay />
              
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                      <span>Room: {roomCode} | </span>span>
                      <span>Language: {myLang === 'en' ? 'English' : 'Vietnamese'}</span>span>
              </div>div>
              
          {liveText && (
                  <div style={{ backgroundColor: '#1e3a5f', padding: 12, borderRadius: 8, marginBottom: 16, textAlign: 'center' }}>
                            <span style={{ color: '#9ca3af' }}>You: </span>span>{liveText}
                  </div>div>
              )}
              
              <div style={{ backgroundColor: '#374151', borderRadius: 8, padding: 16, minHeight: 300, marginBottom: 16, overflowY: 'auto' }}>
                {messages.length === 0 && (
                    <p style={{ color: '#6b7280', textAlign: 'center' }}>Press Talk to start speaking. Your voice will be heard by others while your words are translated.</p>p>
                      )}
                {messages.map(m => (
                    <div key={m.id} style={{ marginBottom: 12, padding: 12, backgroundColor: m.sender === userId ? '#1e3a5f' : '#4b5563', borderRadius: 8 }}>
                                <p style={{ fontSize: 18 }}>
                                              <strong>{m.fromLang === 'en' ? '🇺🇸' : '🇻🇳'}</strong>strong> {m.text}
                                </p>p>
                                <p style={{ color: '#9ca3af', marginTop: 4 }}>
                                              <strong>{m.fromLang === 'en' ? '🇻🇳' : '🇺🇸'}</strong>strong> {m.translated}
                                </p>p>
                    </div>div>
                  ))}
              </div>div>
              
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {!isLive ? (
                    <button onClick={startCall} style={{ backgroundColor: '#16a34a', padding: '16px 48px', borderRadius: 8, color: 'white', border: 'none', fontSize: 18 }}>
                                🎤 Talk
                    </button>button>
                  ) : (
                    <button onClick={endCall} style={{ backgroundColor: '#dc2626', padding: '16px 48px', borderRadius: 8, color: 'white', border: 'none', fontSize: 18 }}>
                                ⏹ End
                    </button>button>
                      )}
                  </div>div>
        </main>main>
      )
}</option>
