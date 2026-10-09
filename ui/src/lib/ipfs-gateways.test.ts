import { describe, expect, it } from 'vitest'
import {
  PUBLIC_IPFS_GATEWAYS,
  publicGatewayUrl,
  sanitizeGatewayUrl,
} from './ipfs-gateways'

const CID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'

describe('publicGatewayUrl', () => {
  it('builds a CID-only gateway link by default', () => {
    expect(publicGatewayUrl(CID)).toBe(
      `https://kubo-render.onrender.com/ipfs/${CID}`,
    )
  })

  it('never emits a localhost base', () => {
    for (const base of [
      'http://localhost:8080',
      'http://127.0.0.1:8080/',
      'localhost:5001',
      '0.0.0.0:8080',
    ]) {
      expect(publicGatewayUrl(CID, base)).toBe(
        `https://kubo-render.onrender.com/ipfs/${CID}`,
      )
    }
  })

  it('keeps non-local bases untouched', () => {
    expect(publicGatewayUrl(CID, 'https://gateway.pinata.cloud')).toBe(
      `https://gateway.pinata.cloud/ipfs/${CID}`,
    )
  })
})

describe('sanitizeGatewayUrl', () => {
  it('rewrites loopback origins to the default public gateway', () => {
    expect(
      sanitizeGatewayUrl(`http://localhost:8080/ipfs/${CID}?filename=file.txt`),
    ).toBe(`https://kubo-render.onrender.com/ipfs/${CID}`)
    expect(sanitizeGatewayUrl(`http://127.0.0.1:8080/ipfs/${CID}`)).toBe(
      `https://kubo-render.onrender.com/ipfs/${CID}`,
    )
  })

  it('strips the filename param from public gateway URLs', () => {
    expect(
      sanitizeGatewayUrl(
        `${PUBLIC_IPFS_GATEWAYS[0].base}/ipfs/${CID}?filename=file.txt`,
      ),
    ).toBe(`${PUBLIC_IPFS_GATEWAYS[0].base}/ipfs/${CID}`)
  })

  it('leaves clean public gateway URLs untouched', () => {
    const url = `${PUBLIC_IPFS_GATEWAYS[0].base}/ipfs/${CID}`
    expect(sanitizeGatewayUrl(url)).toBe(url)
  })

  it('passes through empty and non-URL input', () => {
    expect(sanitizeGatewayUrl('')).toBe('')
    expect(sanitizeGatewayUrl('not a url')).toBe('not a url')
  })
})
