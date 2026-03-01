import { ref, onUnmounted } from "vue"

export function useWebSocket() {
  const connected = ref(false)
  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let pingInterval: ReturnType<typeof setInterval> | null = null
  const handlers = new Map<string, ((data: any) => void)[]>()

  function connect() {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:"
    ws = new WebSocket(`${protocol}//${location.host}/api/ws`)

    ws.onopen = () => {
      connected.value = true
      startPing()
    }

    ws.onclose = () => {
      connected.value = false
      stopPing()
      scheduleReconnect()
    }

    ws.onerror = () => {
      // onclose will fire after onerror, which handles reconnection
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        const callbacks = handlers.get(msg.type) || []
        callbacks.forEach((cb) => cb(msg))
      } catch {
        // Ignore malformed messages
      }
    }
  }

  function subscribe(groupId: string) {
    send({ type: "subscribe", groupId })
  }

  function unsubscribe(groupId: string) {
    send({ type: "unsubscribe", groupId })
  }

  function send(data: any) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
    }
  }

  function on(type: string, handler: (data: any) => void) {
    if (!handlers.has(type)) handlers.set(type, [])
    handlers.get(type)!.push(handler)
  }

  function off(type: string, handler: (data: any) => void) {
    const list = handlers.get(type)
    if (list) {
      const idx = list.indexOf(handler)
      if (idx !== -1) list.splice(idx, 1)
    }
  }

  function startPing() {
    pingInterval = setInterval(() => send({ type: "ping" }), 30000)
  }

  function stopPing() {
    if (pingInterval) {
      clearInterval(pingInterval)
      pingInterval = null
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, 3000)
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    stopPing()
    ws?.close()
    ws = null
    connected.value = false
  }

  onUnmounted(disconnect)

  return { connected, connect, disconnect, subscribe, unsubscribe, on, off }
}
