export const USDFC_CONTRACT_ADDRESS = {
  mainnet: '0x80B98d3aa09ffff255c3ba4A241111Ff1262F045',
  calibration: '0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0',
} as const

export const FILECOIN_RPC = {
  mainnet: 'https://api.node.glif.io/rpc/v1',
  calibration: 'https://api.calibration.node.glif.io/rpc/v1',
} as const

export const API_ENDPOINTS = {
  production: 'https://api.toju.network',
  staging: 'https://staging-api.toju.network',
  local: 'http://localhost:5040',
} as const

export const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]

/**
 * Get API endpoint based on RPC URL
 * Mainnet RPC → production API
 * Calibration RPC → staging API
 * Otherwise → local API
 */
export function getEndpointForRpc(rpcUrl: string): string {
  switch (true) {
    case rpcUrl.includes('api.node.glif.io'):
      return API_ENDPOINTS.production
    case rpcUrl.includes('calibration.node.glif.io'):
      return API_ENDPOINTS.staging
    default:
      return API_ENDPOINTS.local
  }
}
