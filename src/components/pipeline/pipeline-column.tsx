'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Client, ClientStage } from '@/types'
import { ClientCard } from './client-card'
import { cn } from '@/lib/utils'

interface PipelineColumnProps {
  stage: ClientStage
  clients: Client[]
}

export function PipelineColumn({ stage, clients }: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-shrink-0 w-72 rounded-lg border bg-gray-50 p-3',
        isOver && 'ring-2 ring-primary ring-inset'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{stage.name}</h3>
          {stage.is_final && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">
              Final
            </span>
          )}
        </div>
        <span className="text-sm text-muted-foreground font-medium">
          {clients.length}
        </span>
      </div>

      <SortableContext
        items={clients.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 min-h-[100px]">
          {clients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
          
          {clients.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Arraste clientes aqui
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}
