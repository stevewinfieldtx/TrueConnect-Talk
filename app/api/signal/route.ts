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
    const { roomCode, sender, type, payload } = await req.json()

  await pusher.trigger(`room-${roomCode}`, 'webrtc-signal', {
        sender,
        type,
        payload
  })

  return NextResponse.json({ success: true })
}
