import * as React from 'react'
import { Input as BaseInput } from '@base-ui/react/input'
import { cn } from '@/lib/cn'
import styles from './ui.module.css'

export interface InputProps extends React.ComponentPropsWithoutRef<typeof BaseInput> {}

export const Input = React.forwardRef<HTMLElement, InputProps>(({ className, ...props }, ref) => (
  <BaseInput ref={ref} className={cn(styles.input, className)} {...props} />
))

Input.displayName = 'Input'
