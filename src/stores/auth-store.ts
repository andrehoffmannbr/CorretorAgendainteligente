import { create } from 'zustand'
import type { User, Subscription, ClientStage } from '@/types'

interface AuthState {
  user: User | null
  subscription: Subscription | null
  stages: ClientStage[]
  isLoading: boolean
  setUser: (user: User | null) => void
  setSubscription: (subscription: Subscription | null) => void
  setStages: (stages: ClientStage[]) => void
  setIsLoading: (isLoading: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  subscription: null,
  stages: [],
  isLoading: true,
  setUser: (user) => set({ user }),
  setSubscription: (subscription) => set({ subscription }),
  setStages: (stages) => set({ stages }),
  setIsLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ user: null, subscription: null, stages: [], isLoading: false }),
}))
