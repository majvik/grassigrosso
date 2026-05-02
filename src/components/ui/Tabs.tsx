import * as React from 'react'
import { Tabs as BaseTabs } from '@base-ui/react/tabs'
import { cn } from '@/lib/cn'
import styles from './ui.module.css'

export const TabsRoot = BaseTabs.Root

export const TabsList = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseTabs.List>>(
  ({ className, ...props }, ref) => <BaseTabs.List ref={ref} className={cn(styles.tabsList, className)} {...props} />
)
TabsList.displayName = 'TabsList'

export const TabsTrigger = React.forwardRef<HTMLElement, React.ComponentPropsWithoutRef<typeof BaseTabs.Tab>>(
  ({ className, ...props }, ref) => <BaseTabs.Tab ref={ref} className={cn(styles.tabsTrigger, className)} {...props} />
)
TabsTrigger.displayName = 'TabsTrigger'

export const TabsPanel = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseTabs.Panel>>(
  ({ className, ...props }, ref) => <BaseTabs.Panel ref={ref} className={cn(styles.tabsPanel, className)} {...props} />
)
TabsPanel.displayName = 'TabsPanel'

export const Tabs = {
  Root: TabsRoot,
  List: TabsList,
  Trigger: TabsTrigger,
  Panel: TabsPanel,
}
