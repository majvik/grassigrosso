import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'
import styles from './ui.module.css'

const badgeStyles = cva(styles.badge, {
  variants: {
    variant: {
      default: styles.badgeDefault,
      muted: styles.badgeMuted,
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeStyles> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeStyles({ variant }), className)} {...props} />
}
