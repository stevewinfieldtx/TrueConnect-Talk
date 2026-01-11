'use client'
import { useState, useRef } from 'react'
import axios from 'axios'

export default function Home() {
    const [isRecording, setIsRecording] = useState(false)
    const [messages, setMessages] = useState<string[]>([])
    const [roomCode, setRoomCode] = useState('')
    const [myText, setMyText] = useState('')
    const [joined, setJoined] = useState(false)
    const [myLang, setMyLang] = useState('en')
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const audioRef = useRef<HTMLAudioElement>(null)

  const joinRoom = () => {
        if (roomCode) {
                setJoined(true)
        }
  }

    const sendText = async () => {
          if (!myText.trim() || !joined) return
          const msg1 = 'You: ' + myText
          setMessages(prev => [...prev, msg1])
          try {
                  const toLang = myLang === 'en' ? 'vi' : 'en'
                  const res = await axios.post('/api/translate', {
                            type: 'text',
                            content: myText,
                            fromLang: myLang,
                            toLang
                  })
                  const translated = res.data.translated
                  const msg2 = 'Her: ' + translated
                  setMessages(prev => [...prev, msg2])
          } catch (err) {
                  console.error(err)
          }
          setMyText('')
    }

  const startRecording = async () => {
        try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
                mediaRecorderRef.current = recorder
                recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data)
                recorder.onstop = async () => {
                          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                          audioChunksRef.current = []
                                    const reader = new FileReader()
                          reader.readAsDataURL(audioBlob)
                          reader.onloadend = async () => {
                                      const base64data = (reader.result as string).split(',')[1]
                                      try {
                                                    const res = await axios.post('/api/translate', {
                                                                    type: 'voice',
                                                                    audio: base64data,
                                                                    fromLang: myLang
                                                    })
                                                    if (res.data.audioUrl && audioRef.current) {
                                                                    audioRef.current.src = res.data.audioUrl
                                                                    audioRef.current.play()
                                                    }
                                                    const msg3 = 'You: ' + res.data.original
                                                    const msg4 = 'Her: ' + res.data.translated
                                                    setMessages(prev => [...prev, msg3, msg4])
                                      } catch (err) {
                                                    console.error('Translation failed', err)
                                      }
                          }
                }
                recorder.start(250)
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

  return (
        <main style={{ minHeight: '100vh', backgroundColor: '#111827', color: 'white', padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <h1 style={{ fontSize: '30px', fontWeight: 'bold', marginBottom: '24px', textAlign: 'center' }}>Real-time VN-EN Voice and Text</h1>h1>
          {!joined ? (
                  <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', justifyContent: 'center' }}>
                              <input
                                            type="text"
                                            placeholder="Enter room code"
                                            value={roomCode}
                                            onChange={(e) => setRoomCode(e.target.value)}
                                            style={{ backgroundColor: '#1f2937', padding: '12px', borderRadius: '4px', color: 'white', border: 'none' }}
                                          />
                              <button onClick={joinRoom} style={{ backgroundColor: '#2563eb', padding: '12px 24px', borderRadius: '4px', cursor: 'pointer', color: 'white', border: 'none' }}>
                                            Join Room
                              </button>button>
                  </div>div>
                ) : (
                  <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                              <label>My Language: </label>label>
                            <select value={myLang} onChange={(e) => setMyLang(e.target.value)} style={{ backgroundColor: '#1f2937', padding: '8px', borderRadius: '4px', color: 'white', marginLeft: '8px' }}>
                                        <option value="en">English</option>option>
                                        <option value="vi">Vietnamese</option>option>
                            </select>select>
                  </div>div>
              )}
              <div style={{ flex: 1, backgroundColor: '#1f2937', borderRadius: '8px', padding: '16px', marginBottom: '24px', overflowY: 'auto', maxHeight: '384px' }}>
                {messages.map((msg, i) => (
                    <p key={i} style={{ marginBottom: '8px' }}>{msg}</p>p>
                  ))}
              </div>div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
                      <button
                                  onClick={isRecording ? stopRecording : startRecording}
                                  disabled={!joined}
                                  style={{
                                                width: '128px',
                                                height: '128px',
                                                borderRadius: '50%',
                                                fontSize: '18px',
                                                fontWeight: 'bold',
                                                backgroundColor: isRecording ? '#dc2626' : '#4b5563',
                                                cursor: joined ? 'pointer' : 'not-allowed',
                                                color: 'white',
                                                border: 'none'
                                  }}
                                >
                        {isRecording ? 'STOP' : 'TALK'}
                      </button>button>
                      <div style={{ width: '100%', maxWidth: '448px', display: 'flex', gap: '12px' }}>
                                <input
                                              type="text"
                                              value={myText}
                                              onChange={(e) => setMyText(e.target.value)}
                                              placeholder="Or type here..."
                                              style={{ flex: 1, backgroundColor: '#1f2937', padding: '16px', borderRadius: '4px', color: 'white', border: 'none' }}
                                              onKeyDown={(e) => e.key === 'Enter' && sendText()}
                                              disabled={!joined}
                                            />
                                <button onClick={sendText} style={{ backgroundColor: '#16a34a', padding: '16px 24px', borderRadius: '4px', cursor: joined ? 'pointer' : 'not-allowed', color: 'white', border: 'none' }} disabled={!joined}>
                                            Send
                                </button>button>
                      </div>div>
              </div>div>
              <audio ref={audioRef} style={{ display: 'none' }} />
        </main>main>
      )
}</label>
