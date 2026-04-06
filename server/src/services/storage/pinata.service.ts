import { PinataSDK, pinnedFileCount, totalStorageUsage } from 'pinata'
import { logger } from '../../utils/logger.js'

function getClient(): PinataSDK {
  const jwt = process.env.PINATA_JWT
  if (!jwt) throw new Error('PINATA_JWT env var not set')
  return new PinataSDK({ pinataJwt: jwt })
}

/**
 * Returns a gateway URL for a CID.
 * Requires PINATA_GATEWAY env var to be set.
 */
export function gatewayUrl(cid: string, filename?: string): string {
  const base = process.env.PINATA_GATEWAY
  if (!base) throw new Error('PINATA_GATEWAY env var not set')
  return filename
    ? `${base}/ipfs/${cid}/${encodeURIComponent(filename)}`
    : `${base}/ipfs/${cid}`
}

/**
 * Pins one or more files as a directory to Pinata.
 * Always uses fileArray so the returned CID is a directory CID,
 * matching what computeCID produces via createDirectoryEncoderStream.
 */
export async function pinFiles(
  fileMap: Record<string, { buffer: Uint8Array; mimetype: string }>,
  directoryName: string,
): Promise<string> {
  const pinata = getClient()
  const files = Object.entries(fileMap).map(
    ([name, { buffer, mimetype }]) =>
      new File([buffer], name, { type: mimetype }),
  )
  const result = await pinata.upload.public.fileArray(files).name(directoryName)
  logger.info('pinata: directory pinned', { cid: result.cid, directoryName })
  return result.cid
}

/**
 * Removes a pin from Pinata by CID.
 * Looks up the Pinata file ID first since the delete API takes IDs, not CIDs.
 */
export async function unpinCID(cid: string): Promise<void> {
  const pinata = getClient()
  const list = await pinata.files.public.list().cid(cid)
  if (!list.files.length) {
    logger.warn('pinata: no file found for CID, skipping unpin', { cid })
    return
  }
  const fileId = list.files[0].id
  await pinata.files.public.delete([fileId])
  logger.info('pinata: CID unpinned', { cid, fileId })
}

/**
 * Returns total pinned file count and storage bytes from Pinata.
 * Used by the usage monitoring service.
 */
export async function getPinataUsage(): Promise<{
  pinCount: number
  totalSizeBytes: number
}> {
  const pinata = getClient()
  const [pinCount, totalSizeBytes] = await Promise.all([
    pinnedFileCount(pinata.config),
    totalStorageUsage(pinata.config),
  ])
  return { pinCount, totalSizeBytes }
}
