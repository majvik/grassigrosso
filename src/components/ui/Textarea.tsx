import * as React from 'react'
import { cn } from '@/lib/cn'
import styles from './ui.module.css'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn(styles.textarea, className)} {...props} />
)

Textarea.displayName = 'Textarea'
