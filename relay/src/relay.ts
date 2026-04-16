import { DurableObject } from "cloudflare:workers"
import type { Env } from "./index"

// y-webrtc signaling protocol:
// { type: "subscribe", topics: string[] }
// { type: "publish",   topic: string, ... }  → broadcast to all subscribers of that topic
// { type: "ping" } → { type: "pong" }

export class Relay extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
  }

  private getTopics(ws: WebSocket): Set<string> {
    return (ws.deserializeAttachment() as { topics: string[] })?.topics
      ? new Set((ws.deserializeAttachment() as { topics: string[] }).topics)
      : new Set()
  }

  private setTopics(ws: WebSocket, topics: Set<string>) {
    ws.serializeAttachment({ topics: [...topics] })
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    if (typeof raw !== "string") return
    let msg: Record<string, unknown>
    try { msg = JSON.parse(raw) } catch { return }

    switch (msg.type) {
      case "subscribe": {
        const topics = this.getTopics(ws)
        for (const t of (msg.topics as string[]) || []) topics.add(t)
        this.setTopics(ws, topics)
        break
      }
      case "unsubscribe": {
        const topics = this.getTopics(ws)
        for (const t of (msg.topics as string[]) || []) topics.delete(t)
        this.setTopics(ws, topics)
        break
      }
      case "publish": {
        const topic = msg.topic as string
        if (!topic) break
        let clients = 0
        for (const peer of this.ctx.getWebSockets()) {
          if (peer !== ws && this.getTopics(peer).has(topic)) {
            try { peer.send(JSON.stringify({ ...msg, clients })); clients++ } catch {}
          }
        }
        break
      }
      case "ping": {
        try { ws.send(JSON.stringify({ type: "pong" })) } catch {}
        break
      }
    }
  }

  async webSocketClose(ws: WebSocket, code: number) {
    ws.close(code)
  }

  async webSocketError() {}

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") === "websocket") {
      const [client, server] = Object.values(new WebSocketPair())
      this.ctx.acceptWebSocket(server)
      server.serializeAttachment({ topics: [] })
      return new Response(null, { status: 101, webSocket: client })
    }

    const url = new URL(request.url)
    const action = url.pathname.split("/").filter(Boolean)[1]

    const cors = { "access-control-allow-origin": "*" }

    if (action === "ice") {
      const keyId = this.env.TURN_KEY_ID
      const keyToken = this.env.TURN_KEY_TOKEN
      if (!keyId || !keyToken) {
        return Response.json({ iceServers: [{ urls: ["stun:stun.cloudflare.com:3478"] }] }, { headers: cors })
      }
      const res = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`,
        { method: "POST", headers: { Authorization: `Bearer ${keyToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ ttl: 86400 }) },
      )
      return Response.json(await res.json(), { headers: cors })
    }

    const peers = this.ctx.getWebSockets().length
    return new Response(`y-webrtc signaling relay - ${peers} peer${peers !== 1 ? "s" : ""} connected\n`, {
      headers: { "content-type": "text/plain", ...cors },
    })
  }
}
