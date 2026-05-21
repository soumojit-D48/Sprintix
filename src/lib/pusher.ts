import Pusher from 'pusher'

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_APP_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
})

export async function triggerEvent(
  channel: string | string[],
  event: string,
  data: any
) {
  try {
    await pusherServer.trigger(channel, event, data)
  } catch (error) {
    console.error('Failed to trigger Pusher event:', error)
  }
}
