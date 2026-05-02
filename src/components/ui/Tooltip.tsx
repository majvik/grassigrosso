import * as React from 'react'
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip'
import { cn } from '@/lib/cn'
import styles from './ui.module.css'

export const TooltipProvider = BaseTooltip.Provider
export const TooltipRoot = BaseTooltip.Root
export const TooltipTrigger = BaseTooltip.Trigger
export const TooltipPortal = BaseTooltip.Portal

export const TooltipPositioner = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseTooltip.Positioner>>(
  ({ className, ...props }, ref) => <BaseTooltip.Positioner ref={ref} className={cn(styles.tooltipPositioner, className)} {...props} />
)
TooltipPositioner.displayName = 'TooltipPositioner'

export const TooltipPopup = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseTooltip.Popup>>(
  ({ className, ...props }, ref) => <BaseTooltip.Popup ref={ref} className={cn(styles.tooltipPopup, className)} {...props} />
)
TooltipPopup.displayName = 'TooltipPopup'

export const Tooltip = {
  Provider: TooltipProvider,
  Root: TooltipRoot,
  Trigger: TooltipTrigger,
  Portal: TooltipPortal,
  Positioner: TooltipPositioner,
  Popup: TooltipPopup,
}
