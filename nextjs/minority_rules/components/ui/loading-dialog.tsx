"use client"

import * as React from "react"
import { Loader2, Clock } from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from "./dialog"

interface LoadingDialogProps {
  open: boolean
  title?: string
  description?: string
  showCancelButton?: boolean
  onCancel?: () => void
}

export function LoadingDialog({
  open,
  title = "Processing...",
  description = "Please wait while we process your request.",
  showCancelButton = false,
  onCancel,
}: LoadingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={showCancelButton ? onCancel : undefined}>
      <DialogContent 
        className="sm:max-w-md" 
        showCloseButton={showCancelButton}
      >
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-950">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-left">{title}</DialogTitle>
              <DialogDescription className="text-left">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}

// Convenience wrapper for transaction loading
export function TransactionLoadingDialog({
  open,
  operation = "transaction",
}: {
  open: boolean
  operation?: string
}) {
  return (
    <LoadingDialog
      open={open}
      title={`Processing ${operation}...`}
      description="Please wait while your transaction is being processed on the Flow blockchain. This may take a few moments."
    />
  )
}