export interface Category {
  name: string
  icon: string
  color: string
}

export const DEFAULT_CATEGORIES: Category[] = [
  { name: 'Food & Dining', icon: 'utensils', color: '#ef4444' },
  { name: 'Groceries', icon: 'shopping-cart', color: '#f97316' },
  { name: 'Transport', icon: 'car', color: '#eab308' },
  { name: 'Entertainment', icon: 'film', color: '#a855f7' },
  { name: 'Shopping', icon: 'shopping-bag', color: '#ec4899' },
  { name: 'Accommodation', icon: 'home', color: '#3b82f6' },
  { name: 'Utilities', icon: 'zap', color: '#6366f1' },
  { name: 'Health', icon: 'heart', color: '#14b8a6' },
  { name: 'Travel', icon: 'plane', color: '#06b6d4' },
  { name: 'Subscriptions', icon: 'repeat', color: '#8b5cf6' },
  { name: 'Gifts', icon: 'gift', color: '#f43f5e' },
  { name: 'Education', icon: 'book', color: '#10b981' },
  { name: 'Sports', icon: 'activity', color: '#22c55e' },
  { name: 'Other', icon: 'more-horizontal', color: '#6b7280' },
]
