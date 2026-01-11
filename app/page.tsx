'use client'
import { useState, useEffect, useRef } from 'react'
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
    setMessages(prev => [...prev, \\You: \\\\])
    try {
      const toLang = myLang === 'en' ? 'vi' : 'en'
      const res = await axios.post('/api/translate', {
        type: 'text',
        content: myText,
        fromLang: myLang,
        toLang
      })
      const translated = res.data.translated
      setMessages(prev => [...prev, \\Her: \\\\])
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
            setMessages(prev => [...prev, \\You: \\\\])
            setMessages(prev => [...prev, \\Her: \\\\])
          } catch (err) {
            console.error('Translation failed', err)
          }
        }
      }
      recorder.start(250)
      setIsRecording(true)
    } catch (err) {
      alert("Microphone access denied")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6 flex flex-col">
      <h1 className="text-3xl font-bold mb-6 text-center">Real-time VN-EN Voice & Text</h1>
      {!joined ? (
        <div className="mb-6 flex gap-4 justify-center">
          <input
            type="text"
            placeholder="Enter room code"
            value={roomCode}
            onChange={e => setRoomCode(e.target.value)}
            className="bg-gray-800 p-3 rounded"
          />
          <button onClick={joinRoom} className="bg-blue-600 px-6 py-3 rounded hover:bg-blue-700">
            Join Room
          </button>
        </div>
      ) : (
        <div className="mb-4 text-center">
          <label>My Language: </label>
          <select value={myLang} onChange={e => setMyLang(e.target.value)} className="bg-gray-800 p-2 rounded">
            <option value="en">English</option>
            <option value="vi">Vietnamese</option>
          </select>
        </div>
      )}
      <div className="flex-1 bg-gray-900 rounded-lg p-4 mb-6 overflow-y-auto max-h-96">
        {messages.map((msg, i) => <p key={i} className="mb-2">{msg}</p>)}
      </div>
      <div className="flex flex-col items-center gap-6">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!joined}
          className="w-32 h-32 rounded-full text-2xl font-bold bg-red-600 hover:bg-red-700"
        >
          {isRecording ? 'STOP' : 'TALK'}
        </button>
        <div className="w-full max-w-xl flex gap-3">
          <input
            type="text"
            value={myText}
            onChange={e => setMyText(e.target.value)}
            placeholder="Or type here..."
            className="flex-1 bg-gray-800 p-4 rounded"
            onKeyDown={e => e.key === 'Enter' && sendText()}
            disabled={!joined}
          />
          <button onClick={sendText} className="bg-green-700 px-6 py-4 rounded hover:bg-green-600" disabled={!joined}>
            Send
          </button>
        </div>
      </div>
      <audio ref={audioRef} className="hidden" />
    </main>
  )
}
