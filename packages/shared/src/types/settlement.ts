export interface Settlement {
  id: string
  groupId: string
  fromId: string
  toId: string
  amount: number
  currency: string
  note: string | null
  date: number
  createdBy: string
  createdAt: number
}
