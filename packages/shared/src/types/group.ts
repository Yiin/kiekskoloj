export interface Group {
  id: string
  name: string
  currency: string
  color: string | null
  inviteCode: string | null
  archived: boolean
  createdBy: string
  createdAt: number
  updatedAt: number
}

export interface GroupMember {
  id: string
  groupId: string
  userId: string | null
  name: string
  weight: number
  role: 'admin' | 'member' | 'readonly'
  active: boolean
  joinedAt: number
}

export type MemberRole = 'admin' | 'member' | 'readonly'
