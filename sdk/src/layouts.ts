// this file should contain all the borsh-style structs
import { publicKey, struct, u32, u64 } from "@coral-xyz/borsh"

export const configLayout = struct([
  publicKey('admin'),
  u64('ratePerBytePerDay'),
  u32('minDurationDays'),
  publicKey('withdrawalWallet')
])

const depositLayout = struct([
  u32("size"),
  u32("duration")
])

export function encodeDepositInstructionData(cid: string, size: number, duration: number) {
  const cidBuffer = Buffer.from(cid, 'utf-8')

  // according to the Borsh spec, a string is treated as Vec<u8> of its UTF-8 representation
  // so this means we can represent it like so: repr(len as u32) in Borsh.
  // the length prefix of the String, in this case our CID would always be
  // a 4-byte little-endian unsigned integer (u32) because we're mostly interacting with content CIDs
  // prefixed with `bafy...` as opposed to shard CIDs prefixed with `bag...`
  // this entire encoding/decoding process is to ensure it matches what the program expects
  // content_cid: String since borsh doesn't expose a utf8 method
  const len = Buffer.alloc(4)
  len.writeUInt32LE(cidBuffer.length, 0)

  const encodedDepoLayout = depositLayout.encode({size, duration})
  return Buffer.concat([len, cidBuffer, encodedDepoLayout])
}
