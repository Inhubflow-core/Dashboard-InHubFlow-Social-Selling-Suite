import type { CSSProperties } from 'react'
import { Sparkles } from 'lucide-react'
import { cx } from '@visual-studio/lib/cx'
import styles from './Logo.module.css'

export interface LogoProps {
  variant?: 'full' | 'mark'
  height?: number
  className?: string
  title?: string
}

/** InHubFlow Visual Studio mark */
export function Logo({ variant = 'full', height = 28, className, title = 'InHubFlow Studio' }: LogoProps) {
  return (
    <span
      className={cx(styles.logo, className)}
      style={{ '--logo-h': `${height}px`, display: 'inline-flex', alignItems: 'center', gap: '8px' } as CSSProperties}
      role="img"
      aria-label={title}
    >
      <span style={{ 
        width: height, 
        height: height, 
        borderRadius: '8px', 
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', 
        display: 'inline-flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#ffffff'
      }}>
        <Sparkles size={Math.round(height * 0.6)} />
      </span>
      {variant === 'full' ? (
        <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '-0.02em', color: 'var(--color-text, #0f172a)' }} aria-hidden="true">
          InHubFlow Studio
        </span>
      ) : null}
    </span>
  )
}
