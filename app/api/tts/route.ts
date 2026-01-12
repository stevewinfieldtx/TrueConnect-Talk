import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { text, gender } = await req.json()
    
    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    const voiceId = gender === 'female' 
      ? process.env.ELEVENLABS_VOICE_ID_FEMALE 
      : process.env.ELEVENLABS_VOICE_ID_MALE

    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2'
      })
    })

    if (!ttsRes.ok) {
      return NextResponse.json({ error: 'TTS failed' }, { status: 500 })
    }

    const audioBuffer = await ttsRes.arrayBuffer()
    const audioBase64 = Buffer.from(audioBuffer).toString('base64')
    
    return NextResponse.json({ audioUrl: `data:audio/mpeg;base64,${audioBase64}` })
  } catch (error) {
    console.error('TTS error:', error)
    return NextResponse.json({ error: 'TTS failed' }, { status: 500 })
  }
}
