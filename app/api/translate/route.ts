import { NextRequest, NextResponse } from 'next/server'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_TRANSLATE_MODEL = process.env.OPENROUTER_TRANSLATE_MODEL

export async function POST(req: NextRequest) {
    try {
          const body = await req.json()
          const fromLang = body.fromLang || 'en'
          const toLang = fromLang === 'en' ? 'vi' : 'en'
          const langName = toLang === 'vi' ? 'Vietnamese' : 'English'

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                        'Authorization': 'Bearer ' + OPENROUTER_API_KEY,
                        'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                        model: OPENROUTER_TRANSLATE_MODEL,
                        messages: [
                          { role: 'system', content: 'You are a translator. Translate the following text to ' + langName + '. Only output the translation, nothing else.' },
                          { role: 'user', content: body.content }
                                  ]
              })
      })

      const data = await response.json()
          const translated = data.choices[0].message.content.trim()
          return NextResponse.json({ translated })
    } catch (error) {
          console.error('Translation error:', error)
          return NextResponse.json({ error: 'Translation failed' }, { status: 500 })
    }
}
