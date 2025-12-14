import {
  CheckCircleIcon,
  InfoIcon,
  WarningIcon,
  XCircleIcon,
} from '@phosphor-icons/react/dist/ssr'
import { Toaster } from 'sonner'

export const ToastProvider = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: 'var(--bg-dark)',
          color: 'var(--text-inverse)',
          border: '1px solid var(--border-hover)',
          borderRadius: 'var(--radius-lg)',
          fontSize: 'var(--font-size-sm)',
          fontFamily: 'var(--font-family-sans)',
          padding: '1em 1.25em',
          boxShadow: 'var(--shadow-xl)',
        },
        className: 'toast',
      }}
      icons={{
        success: <CheckCircleIcon weight="fill" />,
        error: <XCircleIcon weight="fill" />,
        warning: <WarningIcon />,
        info: <InfoIcon />,
      }}
    />
  )
}
