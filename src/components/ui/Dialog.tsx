import * as React from 'react'
import { Dialog as BaseDialog } from '@base-ui/react/dialog'
import { cn } from '@/lib/cn'
import styles from './ui.module.css'

export const DialogRoot = BaseDialog.Root
export const DialogTrigger = BaseDialog.Trigger
export const DialogPortal = BaseDialog.Portal

export const DialogBackdrop = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseDialog.Backdrop>>(
  ({ className, ...props }, ref) => <BaseDialog.Backdrop ref={ref} className={cn(styles.dialogBackdrop, className)} {...props} />
)
DialogBackdrop.displayName = 'DialogBackdrop'

export const DialogPopup = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseDialog.Popup>>(
  ({ className, ...props }, ref) => <BaseDialog.Popup ref={ref} className={cn(styles.dialogPopup, className)} {...props} />
)
DialogPopup.displayName = 'DialogPopup'

export const DialogTitle = React.forwardRef<HTMLHeadingElement, React.ComponentPropsWithoutRef<typeof BaseDialog.Title>>(
  ({ className, ...props }, ref) => <BaseDialog.Title ref={ref} className={cn(styles.dialogTitle, className)} {...props} />
)
DialogTitle.displayName = 'DialogTitle'

export const DialogDescription = React.forwardRef<HTMLParagraphElement, React.ComponentPropsWithoutRef<typeof BaseDialog.Description>>(
  ({ className, ...props }, ref) => <BaseDialog.Description ref={ref} className={cn(styles.dialogDescription, className)} {...props} />
)
DialogDescription.displayName = 'DialogDescription'

export const DialogClose = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof BaseDialog.Close>>(
  ({ className, ...props }, ref) => <BaseDialog.Close ref={ref} className={cn(styles.dialogClose, className)} {...props} />
)
DialogClose.displayName = 'DialogClose'

export const Dialog = {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Portal: DialogPortal,
  Backdrop: DialogBackdrop,
  Popup: DialogPopup,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
}
