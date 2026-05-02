import * as React from 'react'
import { Select as BaseSelect } from '@base-ui/react/select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'
import styles from './ui.module.css'

export const SelectRoot = BaseSelect.Root
export const SelectPortal = BaseSelect.Portal
export const SelectValue = BaseSelect.Value

export const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof BaseSelect.Trigger>>(
  ({ className, children, ...props }, ref) => (
    <BaseSelect.Trigger ref={ref} className={cn(styles.selectTrigger, className)} {...props}>
      {children}
      <BaseSelect.Icon aria-hidden="true" className={styles.selectIcon}>
        <ChevronDown size={18} strokeWidth={1.75} />
      </BaseSelect.Icon>
    </BaseSelect.Trigger>
  )
)
SelectTrigger.displayName = 'SelectTrigger'

export const SelectPositioner = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseSelect.Positioner>>(
  ({ className, ...props }, ref) => <BaseSelect.Positioner ref={ref} className={cn(styles.selectPositioner, className)} {...props} />
)
SelectPositioner.displayName = 'SelectPositioner'

export const SelectPopup = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseSelect.Popup>>(
  ({ className, ...props }, ref) => <BaseSelect.Popup ref={ref} className={cn(styles.selectPopup, className)} {...props} />
)
SelectPopup.displayName = 'SelectPopup'

export const SelectItem = React.forwardRef<HTMLElement, React.ComponentPropsWithoutRef<typeof BaseSelect.Item>>(
  ({ className, children, ...props }, ref) => (
    <BaseSelect.Item ref={ref} className={cn(styles.selectItem, className)} {...props}>
      <BaseSelect.ItemText>{children}</BaseSelect.ItemText>
      <BaseSelect.ItemIndicator aria-hidden="true" className={styles.selectItemIndicator}>
        <Check size={16} strokeWidth={1.75} />
      </BaseSelect.ItemIndicator>
    </BaseSelect.Item>
  )
)
SelectItem.displayName = 'SelectItem'

export const Select = {
  Root: SelectRoot,
  Trigger: SelectTrigger,
  Value: SelectValue,
  Portal: SelectPortal,
  Positioner: SelectPositioner,
  Popup: SelectPopup,
  Item: SelectItem,
}
