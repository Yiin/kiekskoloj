class WSManager {
  private userSockets = new Map<string, Set<any>>()
  private groupSubscriptions = new Map<string, Set<string>>()

  addConnection(userId: string, ws: any) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set())
    }
    this.userSockets.get(userId)!.add(ws)
  }

  removeConnection(userId: string, ws: any) {
    const sockets = this.userSockets.get(userId)
    if (sockets) {
      sockets.delete(ws)
      if (sockets.size === 0) {
        this.userSockets.delete(userId)
        // Unsubscribe from all groups
        for (const [groupId, users] of this.groupSubscriptions) {
          users.delete(userId)
          if (users.size === 0) {
            this.groupSubscriptions.delete(groupId)
          }
        }
      }
    }
  }

  subscribe(userId: string, groupId: string) {
    if (!this.groupSubscriptions.has(groupId)) {
      this.groupSubscriptions.set(groupId, new Set())
    }
    this.groupSubscriptions.get(groupId)!.add(userId)
  }

  unsubscribe(userId: string, groupId: string) {
    const users = this.groupSubscriptions.get(groupId)
    if (users) {
      users.delete(userId)
      if (users.size === 0) {
        this.groupSubscriptions.delete(groupId)
      }
    }
  }

  broadcast(groupId: string, message: any, excludeUserId?: string) {
    const users = this.groupSubscriptions.get(groupId)
    if (!users) return

    const payload = JSON.stringify(message)
    for (const userId of users) {
      if (userId === excludeUserId) continue
      const sockets = this.userSockets.get(userId)
      if (sockets) {
        for (const ws of sockets) {
          try {
            ws.send(payload)
          } catch {
            // Socket may have closed; ignore
          }
        }
      }
    }
  }
}

export const wsManager = new WSManager()
