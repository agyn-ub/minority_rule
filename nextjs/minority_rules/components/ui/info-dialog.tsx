"use client"

import * as React from "react"
import { Info, Code, AlertCircle, Clock } from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "./dialog"
import { Button } from "./button"

interface InfoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  type?: "info" | "development" | "coming-soon"
  actionLabel?: string
  onAction?: () => void
  showIcon?: boolean
}

export function InfoDialog({
  open,
  onOpenChange,
  title,
  description,
  type = "info",
  actionLabel = "OK",
  onAction,
  showIcon = true,
}: InfoDialogProps) {
  const getIcon = () => {
    switch (type) {
      case "development":
        return <Code className="h-6 w-6 text-orange-600" />
      case "coming-soon":
        return <Clock className="h-6 w-6 text-purple-600" />
      default:
        return <Info className="h-6 w-6 text-blue-600" />
    }
  }

  const getBackgroundColor = () => {
    switch (type) {
      case "development":
        return "bg-orange-50 dark:bg-orange-950"
      case "coming-soon":
        return "bg-purple-50 dark:bg-purple-950"
      default:
        return "bg-blue-50 dark:bg-blue-950"
    }
  }

  const handleAction = () => {
    if (onAction) {
      onAction()
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="flex items-start gap-3">
            {showIcon && (
              <div className={`p-3 rounded-full ${getBackgroundColor()}`}>
                {getIcon()}
              </div>
            )}
            <div className="space-y-2 flex-1">
              <DialogTitle className="text-left">{title}</DialogTitle>
              <DialogDescription className="text-left">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <DialogFooter>
          <Button onClick={handleAction} className="w-full sm:w-auto">
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Convenience wrapper for FCL implementation needed messages
export function DevelopmentDialog({
  open,
  onOpenChange,
  feature,
  description = "This feature is currently under development. FCL transaction implementation is needed.",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  feature: string
  description?: string
}) {
  return (
    <InfoDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${feature} - Under Development`}
      description={description}
      type="development"
      actionLabel="Got it"
    />
  )
}

// Convenience wrapper for copying notifications
export function CopySuccessDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: string
}) {
  return (
    <InfoDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Copied!"
      description={`${item} has been copied to your clipboard.`}
      type="info"
      actionLabel="Great"
    />
  )
}

// Convenience wrapper for transaction status
export function TransactionDialog({
  open,
  onOpenChange,
  title,
  description,
  transactionId,
  onViewTransaction,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  transactionId?: string
  onViewTransaction?: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-full bg-green-50 dark:bg-green-950">
              <Info className="h-6 w-6 text-green-600" />
            </div>
            <div className="space-y-2 flex-1">
              <DialogTitle className="text-left">{title}</DialogTitle>
              <DialogDescription className="text-left">
                {description}
              </DialogDescription>
              {transactionId && (
                <div className="bg-muted rounded-lg p-3 mt-3">
                  <p className="text-xs font-mono text-muted-foreground break-all">
                    <span className="font-medium">TX ID:</span> {transactionId}
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {onViewTransaction && (
            <Button onClick={onViewTransaction}>
              View Transaction
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}