import * as React from 'react'
import { Switch as BaseSwitch } from '@base-ui/react/switch'
import { cn } from '@/lib/cn'
import styles from './ui.module.css'

export interface SwitchProps extends React.ComponentPropsWithoutRef<typeof BaseSwitch.Root> {}

export const Switch = React.forwardRef<HTMLElement, SwitchProps>(({ className, ...props }, ref) => (
  <BaseSwitch.Root ref={ref} className={cn(styles.switchRoot, className)} {...props}>
    <BaseSwitch.Thumb className={styles.switchThumb} />
  </BaseSwitch.Root>
))

Switch.displayName = 'Switch'
