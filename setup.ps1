# TrueConnect-Talk Setup Script

$projectPath = "C:\\Users\\steve\\Documents\\TrueConnect-Talk"

# Create root directory
New-Item -ItemType Directory -Path $projectPath -Force | Out-Null

# Create subdirectories
New-Item -ItemType Directory -Path "$projectPath\\app" -Force | Out-Null
New-Item -ItemType Directory -Path "$projectPath\\api\\translate" -Force | Out-Null
New-Item -ItemType Directory -Path "$projectPath\\lib" -Force | Out-Null
New-Item -ItemType Directory -Path "$projectPath\\public" -Force | Out-Null

# Create package.json
$packageJson = @"
{
  "name": "realtime-translate",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.2.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "socket.io": "^4.7.5",
    "socket.io-client": "^4.7.5",
    "axios": "^1.7.7"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5"
  }
}
"@
Set-Content -Path "$projectPath\\package.json" -Value $packageJson -Encoding UTF8

# Create .env.local
$envLocal = @"
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ELEVENLABS_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
OPENROUTER_WHISPER_MODEL=openai/whisper-large-v3
OPENROUTER_TRANSLATE_MODEL=openai/gpt-4o-mini
"@
Set-Content -Path "$projectPath\\.env.local" -Value $envLocal -Encoding UTF8

# Create tsconfig.json
$tsconfigJson = @"
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
"@
Set-Content -Path "$projectPath\\tsconfig.json" -Value $tsconfigJson -Encoding UTF8

# Create next.config.mjs
$nextConfig = @"
const nextConfig = {
  images: {
    domains: ['example.com'],
  },
};

export default nextConfig;
"@
Set-Content -Path "$projectPath\\next.config.mjs" -Value $nextConfig -Encoding UTF8

# Create app/layout.tsx
$layoutTsx = @"
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Real-Time Translate App",
  description: "Voice and text translation for EN-VN chats",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
"@
Set-Content -Path "$projectPath\\app\\layout.tsx" -Value $layoutTsx -Encoding UTF8

# Create app/globals.css
$globalsCss = @"
body {
  background-color: #111827;
  color: white;
}
"@
Set-Content -Path "$projectPath\\app\\globals.css" -Value $globalsCss -Encoding UTF8

# Create app/page.tsx
$pageTsx = @"
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
    setMessages(prev => [...prev, \\`You: \\${myText}\\`])
    try {
      const toLang = myLang === 'en' ? 'vi' : 'en'
      const res = await axios.post('/api/translate', {
        type: 'text',
        content: myText,
        fromLang: myLang,
        toLang
      })
      const translated = res.data.translated
      setMessages(prev => [...prev, \\`Her: \\${translated}\\`])
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
            setMessages(prev => [...prev, \\`You: \\${res.data.original}\\`])
            setMessages(prev => [...prev, \\`Her: \\${res.data.translated}\\`])
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
"@
Set-Content -Path "$projectPath\\app\\page.tsx" -Value $pageTsx -Encoding UTF8

# Create api/translate/route.ts
$routeTs = @"
import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const VOICE_ID_EN = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'
const VOICE_ID_VI = 'pNInz6obpgDQGcFmaJgB'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const fromLang = body.fromLang || 'en'
    const toLang = fromLang === 'en' ? 'vi' : 'en'
    const voiceId = toLang === 'vi' ? VOICE_ID_VI : VOICE_ID_EN

    if (body.type === 'text') {
      const systemPrompt = \\`You are a perfect translator. Translate only, no explanations.\\`
      const res = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: process.env.OPENROUTER_TRANSLATE_MODEL || 'openai/gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: body.content }
          ]
        },
        { headers: { Authorization: \\`Bearer \\${OPENROUTER_API_KEY}\\` } }
      )
      return NextResponse.json({ translated: res.data.choices[0].message.content.trim() })
    }

    if (body.type === 'voice') {
      const whisperRes = await axios.post(
        'https://openrouter.ai/api/v1/audio/transcriptions',
        { file: \\`data:audio/webm;base64,\\${body.audio}\\`, model: process.env.OPENROUTER_WHISPER_MODEL },
        { headers: { Authorization: \\`Bearer \\${OPENROUTER_API_KEY}\\`, 'Content-Type': 'application/json' } }
      )
      const originalText = whisperRes.data.text.trim()
      if (!originalText) return NextResponse.json({ error: 'No speech detected' }, { status: 400 })

      const translateRes = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: process.env.OPENROUTER_TRANSLATE_MODEL,
          messages: [
            { role: 'system', content: 'Translate only. Make it natural.' },
            { role: 'user', content: originalText }
          ]
        },
        { headers: { Authorization: \\`Bearer \\${OPENROUTER_API_KEY}\\` } }
      )
      const translated = translateRes.data.choices[0].message.content.trim()

      const voiceRes = await axios.post(
        \\`https://api.elevenlabs.io/v1/text-to-speech/\\${voiceId}/stream\\`,
        { text: translated, model_id: 'eleven_multilingual_v2' },
        {
          headers: { 'xi-api-key': ELEVENLABS_API_KEY!, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
          responseType: 'arraybuffer'
        }
      )
      const audioBase64 = Buffer.from(voiceRes.data).toString('base64')
      return NextResponse.json({ original: originalText, translated, audioUrl: \\`data:audio/mp3;base64,\\${audioBase64}\\` })
    }
    return NextResponse.json({ error: 'Invalid request type' }, { status: 400 })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message || 'Service failed' }, { status: 500 })
  }
}
"@
Set-Content -Path "$projectPath\\api\\translate\\route.ts" -Value $routeTs -Encoding UTF8

# Create lib/socket.ts
$socketTs = @"
import { Server } from 'socket.io'

let io: Server | null = null

export function initSocket(httpServer: any) {
  if (!io) {
    io = new Server(httpServer, {
      cors: { origin: '*' }
    })
    io.on('connection', (socket) => {
      socket.on('join', (room) => {
        socket.join(room)
      })
      socket.on('send', (data) => {
        io?.to(data.room).emit('message', data)
      })
    })
  }
  return io
}
"@
Set-Content -Path "$projectPath\\lib\\socket.ts" -Value $socketTs -Encoding UTF8

# Create lib/types.ts
$typesTs = @"
export interface Message {
  text: string;
  translated: string;
  audioUrl?: string;
}
"@
Set-Content -Path "$projectPath\\lib\\types.ts" -Value $typesTs -Encoding UTF8

# Create README.md
$readmeMd = @"
# TrueConnect-Talk

Real-time voice and text translation app for Vietnamese-English conversations.

## Quick Start

1. npm install
2. Update .env.local with your API keys
3. npm run dev

Visit http://localhost:3000
"@
Set-Content -Path "$projectPath\\README.md" -Value $readmeMd -Encoding UTF8

Write-Host "Project created successfully!" -ForegroundColor Green
Write-Host "Location: $projectPath" -ForegroundColor Green