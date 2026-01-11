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
              const systemPrompt = 'You are a perfect translator. Translate only, no explanations.'
              const res = await axios.post(
                        'https://openrouter.ai/api/v1/chat/completions',
                {
                            model: process.env.OPENROUTER_TRANSLATE_MODEL || 'openai/gpt-4o-mini',
                            messages: [
                              { role: 'system', content: systemPrompt },
                              { role: 'user', content: body.content }
                                        ]
                },
                { headers: { Authorization: 'Bearer ' + OPENROUTER_API_KEY } }
                      )
              return NextResponse.json({ translated: res.data.choices[0].message.content.trim() })
      }

      if (body.type === 'voice') {
              const whisperRes = await axios.post(
                        'https://openrouter.ai/api/v1/audio/transcriptions',
                { file: 'data:audio/webm;base64,' + body.audio, model: process.env.OPENROUTER_WHISPER_MODEL },
                { headers: { Authorization: 'Bearer ' + OPENROUTER_API_KEY, 'Content-Type': 'application/json' } }
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
              { headers: { Authorization: 'Bearer ' + OPENROUTER_API_KEY } }
                                )
              const translated = translateRes.data.choices[0].message.content.trim()

            const voiceRes = await axios.post(
                      'https://api.elevenlabs.io/v1/text-to-speech/' + voiceId + '/stream',
              { text: translated, model_id: 'eleven_multilingual_v2' },
              {
                          headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
                        responseType: 'arraybuffer'
              }
                    )
                  const audioBase64 = Buffer.from(voiceRes.data).toString('base64')
              return NextResponse.json({ original: originalText, translated: translated, audioUrl: 'data:audio/mp3;base64,' + audioBase64 })
      }
          return NextResponse.json({ error: 'Invalid request type' }, { status: 400 })
    } catch (error: any) {
          console.error(error)
          return NextResponse.json({ error: error.message || 'Service failed' }, { status: 500 })
    }
}
