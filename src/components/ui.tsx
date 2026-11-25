import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { LucideIcon } from 'lucide-react'
import { AlertCircle, Check, Info, X } from 'lucide-react'
import { cn } from '../lib/utils'
import { useWorkspace } from '../lib/store'

/* ------------------------------------------------------------------- mark */

export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="0.55" y="0.55" width="22.9" height="22.9" rx="6" fill="#0d0f14" stroke="#232733" />
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M7.3 5.4H6.2A1.8 1.8 0 0 0 4.4 7.2v1.1" />
        <path d="M16.7 5.4h1.1a1.8 1.8 0 0 1 1.8 1.8v1.1" />
        <path d="M19.6 15.7v1.1a1.8 1.8 0 0 1-1.8 1.8h-1.1" />
        <path d="M4.4 15.7v1.1a1.8 1.8 0 0 0 1.8 1.8h1.1" />
      </g>
      <rect x="9.1" y="9.1" width="5.8" height="5.8" rx="1.1" stroke="#8b93ff" strokeWidth="1.5" />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return <span className={cn('brand__word', className)}>VIEWPORT</span>
}

/* --------------------------------------------------------------- buttons */

interface IconButtonProps {
  icon: LucideIcon
  label: string
  onClick?: () => void
  active?: boolean
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
  href?: string
}

export function IconButton({
  icon: Icon,
  label,
  onClick,
  active,
  size = 'md',
  disabled,
  className,
  href,
}: IconButtonProps) {
  const classes = cn(
    'icon-btn',
    size === 'sm' && 'icon-btn--sm',
    size === 'lg' && 'icon-btn--lg',
    active && 'is-active',
    className,
  )
  if (href) {
    return (
      <a
        className={classes}
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        aria-label={label}
        title={label}
      >
        <Icon size={14} strokeWidth={1.7} />
      </a>
    )
  }
  return (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
    >
      <Icon size={14} strokeWidth={1.7} />
    </button>
  )
}

/* --------------------------------------------------------------- popover */

interface PopoverProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  align?: 'left' | 'right'
  wide?: boolean
  className?: string
}

export function Popover({ open, onClose, children, align = 'right', wide, className }: PopoverProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div className="popover-scrim" onPointerDown={onClose} />
      <div
        className={cn(
          'popover',
          align === 'right' ? 'popover--right' : 'popover--left',
          wide && 'popover--wide',
          className,
        )}
        role="dialog"
      >
        {children}
      </div>
    </>
  )
}

/* ----------------------------------------------------------------- modal */

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  icon?: LucideIcon
  children: ReactNode
  footer?: ReactNode
  size?: 'default' | 'wide' | 'narrow'
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  children,
  footer,
  size = 'default',
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="modal-scrim"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className={cn(
          'modal',
          size === 'wide' && 'modal--wide',
          size === 'narrow' && 'modal--narrow',
        )}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Dialog'}
      >
        <div className="modal__head">
          {Icon ? (
            <span className="icon-btn icon-btn--lg" aria-hidden="true" style={{ opacity: 0.7 }}>
              <Icon size={16} strokeWidth={1.6} />
            </span>
          ) : null}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="modal__title">{title}</div>
            {subtitle ? <div className="modal__sub">{subtitle}</div> : null}
          </div>
          <IconButton icon={X} label="Close" onClick={onClose} />
        </div>
        <div className="modal__body">{children}</div>
        {footer ? <div className="modal__foot">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}

/* ---------------------------------------------------------------- switch */

interface SwitchProps {
  checked: boolean
  onChange: (next: boolean) => void
  children: ReactNode
  label?: string
}

export function Switch({ checked, onChange, children, label }: SwitchProps) {
  return (
    <button
      type="button"
      className="switch"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span>{children}</span>
      <span className="switch__track" aria-hidden="true" />
    </button>
  )
}

/* ------------------------------------------------------------- segmented */

export interface SegmentOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
  title?: string
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T
  onChange: (next: T) => void
  options: SegmentOption<T>[]
  ariaLabel: string
}) {
  return (
    <div className="segmented" role="tablist" aria-label={ariaLabel}>
      {options.map((option) => {
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={value === option.value}
            title={option.title ?? option.label}
            className={cn('segmented__item', value === option.value && 'is-active')}
            onClick={() => onChange(option.value)}
          >
            {Icon ? <Icon size={13} strokeWidth={1.7} /> : null}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/* ---------------------------------------------------------------- toasts */

export function ToastHost() {
  const toasts = useWorkspace((state) => state.toasts)
  const dismissToast = useWorkspace((state) => state.dismissToast)

  if (toasts.length === 0) return null

  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = toast.kind === 'success' ? Check : toast.kind === 'error' ? AlertCircle : Info
        return (
          <div key={toast.id} className={cn('toast', `toast--${toast.kind}`)}>
            <Icon size={14} strokeWidth={1.8} />
            <span style={{ flex: 1 }}>{toast.message}</span>
            {toast.href ? (
              <a
                className="btn btn--ghost btn--sm"
                href={toast.href}
                target="_blank"
                rel="noreferrer noopener"
              >
                {toast.hrefLabel ?? 'Open'}
              </a>
            ) : null}
            <button
              type="button"
              className="toast__close"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss"
            >
              <X size={12} strokeWidth={2} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ misc */

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
export const MOD = isMac ? '⌘' : 'Ctrl'

export function Kbd({ children }: { children: ReactNode }) {
  return <span className="kbd">{children}</span>
}

export function SectionTitle({ icon: Icon, children }: { icon?: LucideIcon; children: ReactNode }) {
  return (
    <div className="section__title">
      {Icon ? <Icon size={13} strokeWidth={1.7} /> : null}
      {children}
    </div>
  )
}
