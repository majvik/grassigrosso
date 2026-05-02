import * as React from 'react'
import { Button as BaseButton } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'
import styles from './ui.module.css'

const buttonStyles = cva(styles.button, {
  variants: {
    variant: {
      primary: styles.buttonPrimary,
      secondary: styles.buttonSecondary,
      ghost: styles.buttonGhost,
    },
    size: {
      sm: styles.buttonSm,
      md: styles.buttonMd,
      lg: styles.buttonLg,
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
})

export interface ButtonProps
  extends React.ComponentPropsWithoutRef<typeof BaseButton>,
    VariantProps<typeof buttonStyles> {}

export const Button = React.forwardRef<HTMLElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <BaseButton ref={ref} className={cn(buttonStyles({ variant, size }), className)} {...props} />
  )
)

Button.displayName = 'Button'
