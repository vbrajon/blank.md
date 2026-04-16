import { Relay } from "./relay"

export { Relay }

export interface Env {
  RELAY: DurableObjectNamespace
  TURN_KEY_ID: string
  TURN_KEY_TOKEN: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const parts = url.pathname.slice(1).split("/").filter(Boolean)
    const channel = parts[0]

    if (!channel) {
      return new Response("y-webrtc signaling relay\nUsage: WS /:room, GET /:room/ice\n", { headers: { "content-type": "text/plain" } })
    }

    // Route to Durable Object
    const id = env.RELAY.idFromName(channel)
    const stub = env.RELAY.get(id)
    return stub.fetch(request)
  },
} satisfies ExportedHandler<Env>
