import * as React from 'react'
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox'
import { cn } from '@/lib/cn'
import styles from './ui.module.css'

export interface CheckboxProps extends React.ComponentPropsWithoutRef<typeof BaseCheckbox.Root> {}

export const Checkbox = React.forwardRef<HTMLElement, CheckboxProps>(({ className, children, ...props }, ref) => (
  <BaseCheckbox.Root ref={ref} className={cn(styles.checkbox, className)} {...props}>
    <BaseCheckbox.Indicator className={styles.checkboxIndicator} />
    {children}
  </BaseCheckbox.Root>
))

Checkbox.displayName = 'Checkbox'
