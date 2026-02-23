'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks'
import { useToast } from '@/hooks/use-toast'
import { usePipelineStore } from '@/stores'
import type { Client, ClientStage } from '@/types'
import { PipelineColumn } from '@/components/pipeline/pipeline-column'
import { ClientCard } from '@/components/pipeline/client-card'
import { Kanban } from 'lucide-react'

export default function PipelinePage() {
  const { user, stages } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { clientsByStage, setClientsByStage, activeClient, setActiveClient, moveClient } = usePipelineStore()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const { data: clients, isLoading } = useQuery({
    queryKey: ['pipeline-clients'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as Client[]
    },
    enabled: !!user,
  })

  // Organize clients by stage
  useEffect(() => {
    if (clients && stages.length > 0) {
      const organized: Record<string, Client[]> = {}
      
      stages.forEach((stage) => {
        organized[stage.id] = []
      })
      
      clients.forEach((client) => {
        if (organized[client.stage_id]) {
          organized[client.stage_id].push(client)
        }
      })
      
      setClientsByStage(organized)
    }
  }, [clients, stages, setClientsByStage])

  const updateStageMutation = useMutation({
    mutationFn: async ({ clientId, stageId }: { clientId: string; stageId: string }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('clients')
        .update({ stage_id: stageId })
        .eq('id', clientId)
      
      if (error) throw error
    },
    onError: () => {
      // Revert on error
      queryClient.invalidateQueries({ queryKey: ['pipeline-clients'] })
      toast({
        variant: 'destructive',
        title: 'Erro ao mover cliente',
      })
    },
  })

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const activeStage = Object.keys(clientsByStage).find((stageId) =>
      clientsByStage[stageId].some((c) => c.id === active.id)
    )
    
    if (activeStage) {
      const client = clientsByStage[activeStage].find((c) => c.id === active.id)
      if (client) {
        setActiveClient(client)
      }
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveClient(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Find current stage of the client
    const activeStageId = Object.keys(clientsByStage).find((stageId) =>
      clientsByStage[stageId].some((c) => c.id === activeId)
    )

    if (!activeStageId) return

    // Determine target stage
    let targetStageId: string

    // Check if dropped on a stage column
    if (stages.some((s) => s.id === overId)) {
      targetStageId = overId
    } else {
      // Dropped on another client, find their stage
      const targetStage = Object.keys(clientsByStage).find((stageId) =>
        clientsByStage[stageId].some((c) => c.id === overId)
      )
      targetStageId = targetStage || activeStageId
    }

    // If stage changed, update
    if (activeStageId !== targetStageId) {
      // Optimistic update
      moveClient(activeId, activeStageId, targetStageId)
      
      // Persist to database
      updateStageMutation.mutate({
        clientId: activeId,
        stageId: targetStageId,
      })
    }
  }

  if (isLoading || stages.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-muted-foreground">Carregando pipeline...</p>
      </div>
    )
  }

  const totalClients = Object.values(clientsByStage).flat().length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipeline de Vendas</h1>
          <p className="text-muted-foreground">
            {totalClients} cliente{totalClients !== 1 ? 's' : ''} no pipeline
          </p>
        </div>
      </div>

      {totalClients === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Kanban className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">Pipeline vazio</h3>
          <p className="text-muted-foreground">
            Cadastre clientes para começar a gerenciar seu funil de vendas.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages.map((stage) => (
              <PipelineColumn
                key={stage.id}
                stage={stage}
                clients={clientsByStage[stage.id] || []}
              />
            ))}
          </div>

          <DragOverlay>
            {activeClient && <ClientCard client={activeClient} isDragging />}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
