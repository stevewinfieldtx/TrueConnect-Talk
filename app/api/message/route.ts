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
    try {
          const body = await req.json()
          const { roomCode, text, fromLang, sender } = body

      // Translate the message
      const toLang = fromLang === 'en' ? 'vi' : 'en'
          const langName = toLang === 'vi' ? 'Vietnamese' : 'English'

      const translateRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                        'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://true-connect-talk.vercel.app',
                        'X-Title': 'TrueConnect-Talk'
              },
              body: JSON.stringify({
                        model: process.env.OPENROUTER_TRANSLATE_MODEL,
                        messages: [
                          { role: 'system', content: 'You are a translator. Translate to ' + langName + '. Output only the translation.' },
                          { role: 'user', content: text }
                                  ]
              })
      })

      const data = await translateRes.json()
          if (data.error || !data.choices?.[0]) {
                  return NextResponse.json({ error: 'Translation failed' }, { status: 500 })
          }

      const translated = data.choices[0].message.content.trim()
          const messageId = Date.now().toString() + '-' + Math.random().toString(36).substring(7)

      // Send via Pusher to all clients in the room
      await pusher.trigger(`room-${roomCode}`, 'new-message', {
              id: messageId,
              text,
              translated,
              fromLang,
              sender
      })

      return NextResponse.json({ success: true })
    } catch (error) {
          console.error('Message error:', error)
          return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }
}
