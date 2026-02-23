import { create } from 'zustand'
import type { Client } from '@/types'

interface PipelineState {
  // Clients organized by stage_id
  clientsByStage: Record<string, Client[]>
  // Active drag
  activeClient: Client | null
  // Actions
  setClientsByStage: (clientsByStage: Record<string, Client[]>) => void
  setActiveClient: (client: Client | null) => void
  moveClient: (clientId: string, fromStageId: string, toStageId: string) => void
  addClient: (client: Client) => void
  updateClient: (client: Client) => void
  removeClient: (clientId: string, stageId: string) => void
}

export const usePipelineStore = create<PipelineState>((set) => ({
  clientsByStage: {},
  activeClient: null,
  
  setClientsByStage: (clientsByStage) => set({ clientsByStage }),
  
  setActiveClient: (activeClient) => set({ activeClient }),
  
  moveClient: (clientId, fromStageId, toStageId) =>
    set((state) => {
      const fromClients = [...(state.clientsByStage[fromStageId] || [])]
      const toClients = [...(state.clientsByStage[toStageId] || [])]
      
      const clientIndex = fromClients.findIndex((c) => c.id === clientId)
      if (clientIndex === -1) return state
      
      const [client] = fromClients.splice(clientIndex, 1)
      const movedClient = { ...client, stage_id: toStageId }
      toClients.push(movedClient)
      
      return {
        clientsByStage: {
          ...state.clientsByStage,
          [fromStageId]: fromClients,
          [toStageId]: toClients,
        },
      }
    }),
    
  addClient: (client) =>
    set((state) => ({
      clientsByStage: {
        ...state.clientsByStage,
        [client.stage_id]: [...(state.clientsByStage[client.stage_id] || []), client],
      },
    })),
    
  updateClient: (client) =>
    set((state) => ({
      clientsByStage: {
        ...state.clientsByStage,
        [client.stage_id]: (state.clientsByStage[client.stage_id] || []).map((c) =>
          c.id === client.id ? client : c
        ),
      },
    })),
    
  removeClient: (clientId, stageId) =>
    set((state) => ({
      clientsByStage: {
        ...state.clientsByStage,
        [stageId]: (state.clientsByStage[stageId] || []).filter((c) => c.id !== clientId),
      },
    })),
}))
