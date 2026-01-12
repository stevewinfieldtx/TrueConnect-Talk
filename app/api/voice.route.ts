import { NextRequest, NextResponse } from 'next/server'
import Pusher from 'pusher'

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true
})

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const audio = formData.get('audio') as Blob
  const roomCode = formData.get('roomCode') as string
  const fromLang = formData.get('fromLang') as string
  const sender = formData.get('sender') as string
  const gender = formData.get('gender') as string

  const toLang = fromLang === 'en' ? 'vi' : 'en'
  const langName = toLang === 'vi' ? 'Vietnamese' : 'English'

  // 1. Speech-to-text via OpenRouter Whisper
  const audioBuffer = Buffer.from(await audio.arrayBuffer())
  const base64Audio = audioBuffer.toString('base64')
  
  const sttRes = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.OPENROUTER_WHISPER_MODEL || 'openai/whisper-large-v3', file: base64Audio, response_format: 'json' })
  })
  const sttData = await sttRes.json()
  const text = sttData.text || ''

  if (!text.trim()) return NextResponse.json({ error: 'No speech detected' }, { status: 400 })

  // 2. Translate
  const translateRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENROUTER_TRANSLATE_MODEL,
      messages: [{ role: 'system', content: 'Translate to ' + langName }, { role: 'user', content: text }]
    })
  })
  const translateData = await translateRes.json()
  const translated = translateData.choices?.[0]?.message?.content?.trim() || ''

  // 3. Text-to-speech via ElevenLabs
  const voiceId = gender === 'female' ? process.env.ELEVENLABS_VOICE_ID_FEMALE : process.env.ELEVENLABS_VOICE_ID_MALE
  const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: translated, model_id: 'eleven_multilingual_v2' })
  })
  const ttsBuffer = await ttsRes.arrayBuffer()
  const audioUrl = 'data:audio/mpeg;base64,' + Buffer.from(ttsBuffer).toString('base64')

  // 4. Broadcast
  const messageId = Date.now().toString() + '-' + Math.random().toString(36).substring(7)
  await pusher.trigger('room-' + roomCode, 'new-message', { id: messageId, text, translated, fromLang, sender, audioUrl })

  return NextResponse.json({ success: true })
}
