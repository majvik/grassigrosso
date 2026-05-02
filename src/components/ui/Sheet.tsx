import * as React from 'react'
import { Drawer as BaseDrawer } from '@base-ui/react/drawer'
import { cn } from '@/lib/cn'
import styles from './ui.module.css'

export const SheetRoot = BaseDrawer.Root
export const SheetTrigger = BaseDrawer.Trigger
export const SheetPortal = BaseDrawer.Portal

export const SheetBackdrop = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseDrawer.Backdrop>>(
  ({ className, ...props }, ref) => <BaseDrawer.Backdrop ref={ref} className={cn(styles.sheetBackdrop, className)} {...props} />
)
SheetBackdrop.displayName = 'SheetBackdrop'

export const SheetPopup = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseDrawer.Popup>>(
  ({ className, ...props }, ref) => <BaseDrawer.Popup ref={ref} className={cn(styles.sheetPopup, className)} {...props} />
)
SheetPopup.displayName = 'SheetPopup'

export const SheetTitle = React.forwardRef<HTMLHeadingElement, React.ComponentPropsWithoutRef<typeof BaseDrawer.Title>>(
  ({ className, ...props }, ref) => <BaseDrawer.Title ref={ref} className={cn(styles.sheetTitle, className)} {...props} />
)
SheetTitle.displayName = 'SheetTitle'

export const SheetDescription = React.forwardRef<HTMLParagraphElement, React.ComponentPropsWithoutRef<typeof BaseDrawer.Description>>(
  ({ className, ...props }, ref) => <BaseDrawer.Description ref={ref} className={cn(styles.sheetDescription, className)} {...props} />
)
SheetDescription.displayName = 'SheetDescription'

export const SheetClose = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof BaseDrawer.Close>>(
  ({ className, ...props }, ref) => <BaseDrawer.Close ref={ref} className={cn(styles.sheetClose, className)} {...props} />
)
SheetClose.displayName = 'SheetClose'

export const Sheet = {
  Root: SheetRoot,
  Trigger: SheetTrigger,
  Portal: SheetPortal,
  Backdrop: SheetBackdrop,
  Popup: SheetPopup,
  Title: SheetTitle,
  Description: SheetDescription,
  Close: SheetClose,
}
