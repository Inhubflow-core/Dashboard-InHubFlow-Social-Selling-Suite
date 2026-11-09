import type { HTMLAttributes } from 'react'
import { cx } from '@visual-studio/lib/cx'
import styles from './Kbd.module.css'

export function Kbd({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return <kbd className={cx(styles.kbd, className)} {...rest} />
}
