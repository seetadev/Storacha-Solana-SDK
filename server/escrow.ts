import { PublicKey } from '@solana/web3.js'

const PROGRAM_ID = new PublicKey('3QrZkcW2REEEjGjzRy8Ccedq8GjQMPkKAoxdbi4nf88n')

const [escrowPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from('escrow')],
  PROGRAM_ID,
)

console.log('Escrow PDA:', escrowPDA.toBase58())
console.log(
  'View on Solscan:',
  `https://solscan.io/account/${escrowPDA.toBase58()}?cluster=testnet`,
)
