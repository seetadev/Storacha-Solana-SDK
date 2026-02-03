import { Logtail } from '@logtail/node'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'
type LogContext = Record<string, unknown>

const sourceToken = process.env.BTRSTACK_SOURCE_TOKEN
const sourceId = process.env.BTRSTACK_SOURCE_ID
const ingestingHost = process.env.BTRSTACK_INGESTING_HOST

const logtail =
  sourceToken && ingestingHost
    ? new Logtail(sourceToken, { endpoint: `https://${ingestingHost}` })
    : null

// according to their docs... we have to ensure logs are sent.
if (logtail) {
  process.on('beforeExit', () => {
    logtail.flush()
  })
  process.on('SIGINT', () => {
    logtail.flush()
    process.exit(0)
  })
  process.on('SIGTERM', () => {
    logtail.flush()
    process.exit(0)
  })
}

const buildContext = (context?: LogContext) => {
  if (!sourceId) return context || {}
  return { sourceId, ...(context || {}) }
}

const writeLine = (level: LogLevel, payload: LogContext) => {
  const line = JSON.stringify(payload)
  if (level === 'error') {
    process.stderr.write(line + '\n')
  } else {
    process.stdout.write(line + '\n')
  }
}

const log = (level: LogLevel, message: string, context?: LogContext) => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...buildContext(context),
  }

  writeLine(level, payload)

  if (logtail) {
    logtail.log(message, level, buildContext(context)).catch((err) => {
      writeLine('error', {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Failed to send log to Logtail',
        error: err instanceof Error ? err.message : String(err),
        ...buildContext(),
      })
    })
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) =>
    log('debug', message, context),
  info: (message: string, context?: LogContext) =>
    log('info', message, context),
  warn: (message: string, context?: LogContext) =>
    log('warn', message, context),
  error: (message: string, context?: LogContext) =>
    log('error', message, context),
  http: (context?: LogContext) => {
    const method = context?.method || 'HTTP'
    const path = context?.path || ''
    const status = context?.status || ''
    const message = `${method} ${path} ${status}`.trim()
    log('info', message, context)
  },
  stream: {
    write: (message: string) => {
      const trimmed = message.trim()
      if (!trimmed) return
      try {
        const parsed = JSON.parse(trimmed)
        const method = parsed.method || 'HTTP'
        const path = parsed.path || ''
        const status = parsed.status || ''
        const logMessage = `${method} ${path} ${status}`.trim()
        log('info', logMessage, parsed)
      } catch {
        log('info', 'http_request', { message: trimmed })
      }
    },
  },
}
