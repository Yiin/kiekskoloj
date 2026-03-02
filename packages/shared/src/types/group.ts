export interface Group {
  id: string
  name: string
  currency: string
  color: string | null
  inviteCode: string | null
  archived: boolean
  createdAt: number
  updatedAt: number
}

export interface GroupMember {
  id: string
  groupId: string
  name: string
  weight: number
  active: boolean
  joinedAt: number
}
