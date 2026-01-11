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
