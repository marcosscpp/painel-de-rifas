import { io, type Socket } from 'socket.io-client'

// Conexão única e preguiçosa: só abre quando alguma tela pedir.
let socket: Socket | null = null

export function getSocket(): Socket {
  socket ??= io({ path: '/socket.io', withCredentials: true, autoConnect: false })
  if (!socket.connected) socket.connect()
  return socket
}
