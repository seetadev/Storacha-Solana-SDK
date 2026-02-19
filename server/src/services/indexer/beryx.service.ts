import fetch from 'node-fetch'
import { BeryxTransfersResponse, Erc20Transfer } from '../../types.js'

const CALIBRATION_BASE = 'https://api.zondax.ch/fil/data/v4/calibration'
const MAINNET_BASE = 'https://api.zondax.ch/fil/data/v4/mainnet'

function getBaseUrl() {
  return process.env.NODE_ENV === 'production' ? MAINNET_BASE : CALIBRATION_BASE
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
