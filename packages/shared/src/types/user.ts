export interface User {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  locale: string
  createdAt: number
  updatedAt: number
}

export interface UserProfile {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  locale: string
}
