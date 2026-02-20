import fetch from 'node-fetch'
import { BeryxTransfersResponse, Erc20Transfer } from '../../types.js'

const FILECOIN_INDEXER_BASE_URL = {
  mainnet: 'https://api.zondax.ch/fil/data/v4/mainnet',
  calibration: 'https://api.zondax.ch/fil/data/v4/calibration',
} as const

export function getFilecoinNetwork(): keyof typeof FILECOIN_INDEXER_BASE_URL {
  const network = process.env.FILECOIN_NETWORK

  if (network !== 'mainnet' && network !== 'calibration') {
    throw new Error('Invalid FILECOIN_NETWORK configuration')
  }

  return network
}

export function getUsdfcContractAddress(): string {
  const network = getFilecoinNetwork()

  return network === 'mainnet'
    ? '0x80B98d3aa09ffff255c3ba4A241111Ff1262F045'
    : '0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0'
}

function getBaseUrl(): string {
  const network = getFilecoinNetwork()
  return FILECOIN_INDEXER_BASE_URL[network]
}

export async function getAddressTransfers(
  address: string,
): Promise<Erc20Transfer[]> {
  const baseUrl = getBaseUrl()

  const response = await fetch(
    `${baseUrl}/transactions/erc20/address/${address}/transfers`,
    {
      headers: {
        Authorization: `Bearer ${process.env.BERYX_API_KEY}`,
      },
    },
  )

  if (!response.ok) {
    throw new Error(`Beryx request failed: ${response.status}`)
  }

  const data = (await response.json()) as BeryxTransfersResponse

  return data.transfers || []
}
