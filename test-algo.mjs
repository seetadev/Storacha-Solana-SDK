import { createAlgoAgentClient } from './packages/algo/dist/index.js'

const MNEMONIC = process.env.ALGO_MNEMONIC;
if (!MNEMONIC) {
  console.error('Set ALGO_MNEMONIC env var before running')
  process.exit(1)
}

const client = createAlgoAgentClient({
  mnemonic: MNEMONIC,
  environment: 'testnet',
  endpoint: 'http://localhost:3000',
})

console.log('Agent address:', client.address)

// Step 1: estimate cost for a small file stored 7 days
console.log('\nEstimating cost...')
const estimate = await client.estimateStorageCost(1000, 7)
console.log(`Cost: ${estimate.algo} ALGO (~$${estimate.usd}) = ${estimate.microAlgo} microALGO`)

// Step 2: upload a small test file
console.log('\nUploading file...')
const file = new File([Buffer.from('hello from toju algo x402 test!')], 'test.txt', { type: 'text/plain' })

const result = await client.store(file, { durationDays: 7 })

console.log('\n--- Upload Result ---')
console.log('CID:        ', result.cid)
console.log('File:       ', result.fileName)
console.log('Size:       ', result.fileSize, 'bytes')
console.log('Expires:    ', result.expiresAt)
console.log('Payment TX: ', result.paymentTxId)
console.log('IPFS URL:   ', `https://ipfs.io/ipfs/${result.cid}`)
console.log('Algo TX:    ', `https://testnet.explorer.perawallet.app/tx/${result.paymentTxId}`)
