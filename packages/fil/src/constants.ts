export const USDFC_ADDRESS = {
  mainnet: '0xdc84FD2D9a8DCd7118Cd11A7577c818c4BF5a417',
  calibration: '0xdc84FD2D9a8DCd7118Cd11A7577c818c4BF5a417',
} as const

export const FILECOIN_RPC = {
  mainnet: 'https://api.node.glif.io/rpc/v1',
  calibration: 'https://api.calibration.node.glif.io/rpc/v1',
} as const

export const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]
