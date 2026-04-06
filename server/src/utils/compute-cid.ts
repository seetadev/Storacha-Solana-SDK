import { CAREncoderStream, createDirectoryEncoderStream } from 'ipfs-car'
import { logger } from './logger.js'

/**
 * Pre-computes the IPFS-compatible CID for a file or directory.
 * Always uses directory encoding so the CID matches what Pinata pins
 * via fileArray — which is required for payment verification.
 */
export async function computeCID(
  fileMap: Record<string, Uint8Array>,
): Promise<string> {
  try {
    const files = Object.entries(fileMap).map(([name, content]) => ({
      name,
      stream: () =>
        new ReadableStream({
          start(controller) {
            controller.enqueue(content)
            controller.close()
          },
        }),
    }))

    let rootCID: any
    let blockCount = 0

    await createDirectoryEncoderStream(files)
      .pipeThrough(
        new TransformStream({
          transform(block, controller) {
            blockCount++
            rootCID = block.cid
            controller.enqueue(block)
          },
        }),
      )
      .pipeThrough(new CAREncoderStream())
      .pipeTo(new WritableStream())

    logger.info('CID computed', { blockCount, cid: rootCID?.toString() })
    return rootCID.toString()
  } catch (error) {
    logger.error('Error computing CID', {
      error: error instanceof Error ? error.message : String(error),
    })
    throw new Error(
      `Failed to compute CID: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}
