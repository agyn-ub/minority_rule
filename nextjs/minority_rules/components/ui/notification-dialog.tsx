"use client"

import * as React from "react"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "./dialog"
import { Button } from "./button"

interface NotificationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  type?: "success" | "error" | "warning"
  showIcon?: boolean
  primaryAction?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
}

export function NotificationDialog({
  open,
  onOpenChange,
  title,
  description,
  type = "success",
  showIcon = true,
  primaryAction,
  secondaryAction,
}: NotificationDialogProps) {
  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-6 w-6 text-green-600" />
      case "error":
        return <XCircle className="h-6 w-6 text-red-600" />
      case "warning":
        return <AlertCircle className="h-6 w-6 text-yellow-600" />
      default:
        return <CheckCircle className="h-6 w-6 text-green-600" />
    }
  }

  const getBackgroundColor = () => {
    switch (type) {
      case "success":
        return "bg-green-50 dark:bg-green-950"
      case "error":
        return "bg-red-50 dark:bg-red-950"
      case "warning":
        return "bg-yellow-50 dark:bg-yellow-950"
      default:
        return "bg-green-50 dark:bg-green-950"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            {showIcon && (
              <div className={`p-3 rounded-full ${getBackgroundColor()}`}>
                {getIcon()}
              </div>
            )}
            <div className="space-y-2">
              <DialogTitle className="text-left">{title}</DialogTitle>
              <DialogDescription className="text-left">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {secondaryAction && (
            <Button
              variant="outline"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
          <Button
            variant={type === "error" ? "destructive" : "default"}
            onClick={() => {
              if (primaryAction) {
                primaryAction.onClick()
              } else {
                onOpenChange(false)
              }
            }}
          >
            {primaryAction ? primaryAction.label : "OK"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Convenience wrapper for simple success notifications
export function SuccessDialog({
  open,
  onOpenChange,
  title,
  description,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
}) {
  return (
    <NotificationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      type="success"
    />
  )
}

// Convenience wrapper for error notifications
export function ErrorDialog({
  open,
  onOpenChange,
  title,
  description,
  onRetry,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onRetry?: () => void
}) {
  return (
    <NotificationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      type="error"
      secondaryAction={onRetry ? {
        label: "Try Again",
        onClick: onRetry
      } : undefined}
    />
  )
}