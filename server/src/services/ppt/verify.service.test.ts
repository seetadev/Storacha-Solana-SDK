import {
  PPT_FEE_AMOUNT,
  PPT_TOKEN_ADDRESS,
  PPT_CHAIN_ID,
} from '../../utils/ppt/constants.js'
import { parseTransferAmount } from './verify.service.js'

describe('PPT constants', () => {
  it('uses MeshKit Arbitrum Sepolia PPT token', () => {
    expect(PPT_TOKEN_ADDRESS.toLowerCase()).toBe(
      '0x38c505ee3fdf02c0a041b08611adb2f1d92df410',
    )
    expect(PPT_CHAIN_ID).toBe(421614)
  })

  it('charges exactly 1 PPT (18 decimals) per operation', () => {
    expect(PPT_FEE_AMOUNT).toBe(10n ** 18n)
  })
})

describe('parseTransferAmount', () => {
  it('parses 1 PPT from Transfer log data', () => {
    const onePpt =
      '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000'
    expect(parseTransferAmount(onePpt)).toBe(10n ** 18n)
  })

  it('accepts amounts greater than or equal to 1 PPT', () => {
    const twoPpt =
      '0x0000000000000000000000000000000000000000000000001bc16d674ec80000'
    expect(parseTransferAmount(twoPpt)).toBe(2n * 10n ** 18n)
    expect(parseTransferAmount(twoPpt) >= PPT_FEE_AMOUNT).toBe(true)
  })
})
