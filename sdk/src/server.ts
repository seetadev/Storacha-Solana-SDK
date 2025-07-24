import { ServerOptions, UploadOptions, UploadResult } from './types';

export class Server {
  private baseUrl: string;

  constructor(options: ServerOptions = {}) {
    this.baseUrl = options.url ?? 'https://program-backend-server.com/api';
  }

  /**
   * Notify the server of a new on-chain deposit for file storage.
   * This registers the CID, size, and duration to track storage expiration.
   */
  async notifyUpload(meta: UploadOptions): Promise<UploadResult> {
    const request = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      // i doubt this is accurate uploading stuff shouldn't be done via json?
      // it is only fine if we never pass file/blobs through this assumed route though;
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...meta,
        cid: meta.cid.toString(),
      }),
    });

    if (!request.ok) {
      const error = await request.text(); // this needs to match what the server returns. circle back
      throw new Error(`Upload notice failed ${error}`);
    }

    const response = await request.json();
    // everythng here is still a scaffold. need to consolidate with
    // what the server returns
    return {
      cid: response.cid,
      url: response.url,
      size: response.size,
      expiresAt: response.expiresAt,
    };
  }

  async getUploadsForWallet(walletAddress: string): Promise<UploadResult[]> {
    const request = await fetch(
      `${this.baseUrl}/uploads?wallet=${walletAddress}` // this assumes that the i can query the server with this parameter. still need to check with the B.E implementation
    );
    if (!request.ok) throw new Error('Failed to fetch uploads');
    return await request.json();
  }
}
