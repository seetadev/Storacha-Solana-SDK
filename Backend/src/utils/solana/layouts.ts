export function encodeDepositInstructionData(
  cid: string,
  size: number,
  duration: number,
) {
  const cidBuffer = Buffer.from(cid, "utf-8");

  // Length prefix for CID (u32 little-endian)
  const cidLengthBuffer = Buffer.alloc(4);
  cidLengthBuffer.writeUInt32LE(cidBuffer.length, 0);

  const depositBuffer = Buffer.alloc(8);
  depositBuffer.writeUInt32LE(size, 0);
  depositBuffer.writeUInt32LE(duration, 4);

  return Buffer.concat([cidLengthBuffer, cidBuffer, depositBuffer]);
}
