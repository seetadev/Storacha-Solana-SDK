import { wrapFetchWithPayment as E } from '@x402/fetch'
import {
  ALGORAND_MAINNET_GENESIS_HASH as u,
  ALGORAND_TESTNET_GENESIS_HASH as S,
  toClientAvmSigner as h,
} from '@x402/avm'
import { ExactAvmScheme as O } from '@x402/avm/exact/client'
import { x402Client as f } from '@x402/core/client'
import R from 'algosdk'
var l = {
  mainnet: 'https://api.toju.network',
  testnet: 'https://staging-api.toju.network',
}
var g = {
    mainnet: 'https://mainnet-api.algonode.cloud',
    testnet: 'https://testnet-api.algonode.cloud',
  },
  c = ''
var d = '/upload/algo-agent',
  A = '/pricing/quote'
function y(s) {
  let e = ''
  for (let t = 0; t < s.length; t++) e += String.fromCharCode(s[t])
  return btoa(e)
}
var m = class {
  constructor({
    mnemonic: e,
    environment: t,
    endpoint: r,
    algodServer: n,
    algodToken: o,
  }) {
    ;(this.environment = t),
      (this.apiEndpoint = r ?? l[t]),
      (this.network = `algorand:${t === 'mainnet' ? u : S}`)
    let i = R.mnemonicToSecretKey(e),
      a = y(i.sk)
    this.signer = h(a)
    let p = new O(this.signer, {
      algodUrl: n ?? g[t],
      algodToken: (o ?? c) || void 0,
    })
    ;(this.x402 = new f()),
      this.x402.register(this.network, p),
      this.x402.setSpendControls(!1)
  }
  get address() {
    return this.signer.address
  }
  async store(e, { durationDays: t }) {
    let r = `${this.apiEndpoint}${d}?size=${e.size}&duration=${t}`,
      n = new FormData()
    n.append('file', e)
    let o = await E(fetch, this.x402)(r, { method: 'POST', body: n })
    if (!o.ok) {
      let i = await o.json().catch(() => ({}))
      throw new Error(
        i.message ?? i.error ?? `Upload failed with status ${o.status}`,
      )
    }
    return o.json()
  }
  async estimateStorageCost(e, t) {
    let r = await fetch(
      `${this.apiEndpoint}${A}?size=${e}&duration=${t}&chain=algo`,
    )
    if (!r.ok)
      throw new Error('Failed to fetch storage cost estimate from toju API')
    let { quote: n } = await r.json(),
      o = n.totalCost,
      i = n.algoPrice ?? 0.15,
      a = o / i,
      p = Math.ceil(a * 1e6)
    return { algo: a.toFixed(6), usd: o.toFixed(2), microAlgo: p }
  }
}
function x(s) {
  return new m(s)
}
export { m as AlgoAgentClient, x as createAlgoAgentClient }
