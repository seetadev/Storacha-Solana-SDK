import {
  CAREncoderStream,
  createDirectoryEncoderStream,
  createFileEncoderStream,
} from 'ipfs-car'
import { logger } from './logger.js'

/**
 * Builds a CAR from a file map and returns the root CID + raw CAR bytes.
 * Use this when you need both the CID and the bytes to upload to a pinning service.
 */
export async function buildCAR(
  fileMap: Record<string, Uint8Array>,
): Promise<{ cid: string; carBuffer: Uint8Array }> {
  const chunks: Uint8Array[] = []
  let rootCID: any

  const encoderStream =
    Object.keys(fileMap).length === 1
      ? createFileEncoderStream(new Blob([Object.values(fileMap)[0]]))
      : createDirectoryEncoderStream(
          Object.entries(fileMap).map(([name, content]) => ({
            name,
            stream: () =>
              new ReadableStream({
                start(controller) {
                  controller.enqueue(content)
                  controller.close()
                },
              }),
          })),
        )

  await encoderStream
    .pipeThrough(
      new TransformStream({
        transform(block, controller) {
          rootCID = block.cid
          controller.enqueue(block)
        },
      }),
    )
    .pipeThrough(new CAREncoderStream())
    .pipeTo(
      new WritableStream({
        write(chunk) {
          chunks.push(new Uint8Array(chunk))
        },
      }),
    )

  const total = chunks.reduce((sum, c) => sum + c.length, 0)
  const carBuffer = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    carBuffer.set(chunk, offset)
    offset += chunk.length
  }

  return { cid: rootCID.toString(), carBuffer }
}

/**
 * Pre-computes the CID for a file or directory without retaining the CAR bytes.
 * Used in the deposit flow where only the CID is needed.
 */
export async function computeCID(
  fileMap: Record<string, Uint8Array>,
): Promise<string> {
  try {
    const { cid } = await buildCAR(fileMap)
    return cid
  } catch (error) {
    logger.error('Error computing CID', {
      error: error instanceof Error ? error.message : String(error),
    })
    throw new Error(
      `Failed to compute CID: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}
