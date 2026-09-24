import { sql } from 'drizzle-orm'
import { Request, Response } from 'express'
import { db } from '../db/db.js'
import { checkNodeHealth } from '../services/storage/meshkit.service.js'

export const getServerHealth = async (_req: Request, res: Response) => {
  try {
    await db.execute(sql`SELECT 1`)

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: 'up',
        server: 'up',
      },
    })
  } catch (_error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'down',
        server: 'up',
      },
    })
  }
}

/**
 * GET /health/ipfs?nodeUrl=http://kubo.example.com:5001
 *
 * Tests whether a Kubo node is reachable and responsive.
 * Used by the UI "Test connection" button for remote node configuration.
 *
 * Returns:
 *   200  { ok: true,  nodeUrl, latencyMs, pinCount }
 *   503  { ok: false, nodeUrl, latencyMs, error }
 */
export const checkIpfsNodeHealth = async (req: Request, res: Response) => {
  const nodeUrl = req.query.nodeUrl as string | undefined

  if (!nodeUrl) {
    return res.status(400).json({
      ok: false,
      error: 'nodeUrl query parameter is required',
    })
  }

  const start = Date.now()

  try {
    const result = await checkNodeHealth(nodeUrl)
    return res.status(200).json({
      ...result,
      latencyMs: Date.now() - start,
    })
  } catch (err) {
    return res.status(503).json({
      ok: false,
      nodeUrl,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Node unreachable',
    })
  }
}
