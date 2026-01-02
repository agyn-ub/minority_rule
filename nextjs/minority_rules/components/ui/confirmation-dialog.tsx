"use client"

import * as React from "react"
import { AlertTriangle, HelpCircle } from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "./dialog"
import { Button } from "./button"

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "default" | "destructive"
  loading?: boolean
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
  showIcon?: boolean
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  onConfirm,
  onCancel,
  showIcon = true,
}: ConfirmationDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true)
      await onConfirm()
      onOpenChange(false)
    } catch (error) {
      // Keep dialog open on error - let parent handle error state
      console.error("Confirmation action failed:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
    onOpenChange(false)
  }

  const getIcon = () => {
    switch (variant) {
      case "destructive":
        return <AlertTriangle className="h-6 w-6 text-red-600" />
      default:
        return <HelpCircle className="h-6 w-6 text-blue-600" />
    }
  }

  const getBackgroundColor = () => {
    switch (variant) {
      case "destructive":
        return "bg-red-50 dark:bg-red-950"
      default:
        return "bg-blue-50 dark:bg-blue-950"
    }
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
        
        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting || loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            onClick={handleConfirm}
            disabled={isSubmitting || loading}
          >
            {isSubmitting || loading ? "Loading..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Convenience wrapper for destructive actions (deletes, etc)
export function DestructiveConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  loading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void | Promise<void>
  loading?: boolean
}) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      variant="destructive"
      onConfirm={onConfirm}
      loading={loading}
    />
  )
}