'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'
import type { Client } from '@/types'
import { cn, formatPhone, translateTransactionType } from '@/lib/utils'
import { ROUTES } from '@/constants'
import { Phone, GripVertical } from 'lucide-react'

interface ClientCardProps {
  client: Client
  isDragging?: boolean
}

export function ClientCard({ client, isDragging }: ClientCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: client.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const dragging = isDragging || isSortableDragging

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-white rounded-lg border p-3 shadow-sm cursor-grab active:cursor-grabbing',
        dragging && 'opacity-50 shadow-lg rotate-2'
      )}
    >
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 text-muted-foreground hover:text-foreground cursor-grab"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <Link
            href={`${ROUTES.CLIENTS}/${client.id}`}
            className="font-medium text-sm hover:text-primary truncate block"
          >
            {client.name}
          </Link>
          
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <Phone className="h-3 w-3" />
            {formatPhone(client.phone)}
          </div>
          
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              {translateTransactionType(client.desired_transaction_type)}
            </span>
            {client.city && (
              <span className="text-xs text-muted-foreground truncate">
                {client.city}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
