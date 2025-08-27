import {
  Connection,
  Transaction,
  TransactionInstruction,
  PublicKey,
  clusterApiUrl,
} from "@solana/web3.js";
import axios from "axios";


export interface UploadResult {
  success: boolean;
  signature?: string;
  error?: string;
  cid?: string;
  fileUrl?: string;
  fileInfo?: {
    filename: string;
    size: number;
    type: string;
    uploadedAt: string;
  };
}


export interface ApiResponse {
  message: string;
  cid: string;
  instructions: Array<{
    programId: string;
    keys: Array<{
      pubkey: string;
      isSigner: boolean;
      isWritable: boolean;
    }>;
    data: string;
  }>;
  object: {
    cid: string;
    filename: string;
    size: number;
    type: string;
    url: string;
    uploadedAt: string;
  };
}


export class UploadService {
  private connection: Connection;
  private apiBaseUrl: string;


  constructor() {
    this.connection = new Connection(clusterApiUrl("testnet"), "confirmed");
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5040/api";
  }


  async uploadFileWithDeposit(
    file: File,
    durationDays: number,
    publicKey: PublicKey,
    signTransaction: (tx: Transaction) => Promise<Transaction>
  ): Promise<UploadResult> {
    try {
      // Step 1: Upload file and get deposit instruction
      console.log('🚀 Starting file upload...');
      const formData = new FormData();
      formData.append("file", file);
      formData.append("duration", String(durationDays * 86400));
      formData.append("publicKey", publicKey.toBase58());

      const uploadResponse = await fetch(`${this.apiBaseUrl}/user/uploadFile`, {
        method: "POST",
        body: formData,
      });

      console.log({ uploadResponse });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error("❌ Upload API error:", errorText);
        throw new Error(`HTTP ${uploadResponse.status}: ${errorText}`);
      }

      const responseText = await uploadResponse.text();
      console.log('📄 Raw API response:', responseText);

      let apiData: ApiResponse;
      try {
        apiData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        throw new Error('Invalid JSON response');
      }

      console.log('✅ Parsed API response:', apiData);

      // Validate instructions
      if (!apiData.instructions || !Array.isArray(apiData.instructions)) {
        console.error('❌ Invalid instructions:', apiData.instructions);
        throw new Error("Invalid instructions format");
      }

      if (apiData.instructions.length === 0) {
        throw new Error("No instructions received");
      }

      const instruction = apiData.instructions[0];
      console.log('Instruction:', instruction);

      if (!instruction.programId || !instruction.keys || !instruction.data) {
        throw new Error("Malformed instruction data");
      }

      // Build transaction
      const latestBlockhash = await this.connection.getLatestBlockhash("confirmed");
      const transactionKeys = instruction.keys.map((k, i) => {
        if (!k.pubkey) throw new Error(`Missing pubkey at index ${i}`);
        try {
          return {
            pubkey: new PublicKey(k.pubkey),
            isSigner: k.isSigner,
            isWritable: k.isWritable,
          };
        } catch {
          throw new Error(`Invalid pubkey at index ${i}: ${k.pubkey}`);
        }
      });

      let instructionData: Buffer;
      try {
        instructionData = Buffer.from(instruction.data, "base64");
      } catch {
        throw new Error("Invalid base64 instruction data");
      }

      const depositIx = new TransactionInstruction({
        programId: new PublicKey(instruction.programId),
        keys: transactionKeys,
        data: instructionData,
      });

      const transaction = new Transaction({
        recentBlockhash: latestBlockhash.blockhash,
        feePayer: publicKey,
      });
      transaction.add(depositIx);

      console.log('Requesting signature...');
      const signedTransaction = await signTransaction(transaction);

      console.log('Sending transaction...');
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      console.log('Confirming transaction...');
      const confirmation = await this.connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      }, "confirmed");

      if (confirmation.value.err) {
        console.error('Tx confirmation error:', confirmation.value.err);
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log('✅ Transaction confirmed:', signature);

      return {
        success: true,
        signature,
        cid: apiData.cid,
        fileUrl: apiData.object?.url,
        fileInfo: apiData.object ? {
          filename: apiData.object.filename,
          size: apiData.object.size,
          type: apiData.object.type,
          uploadedAt: apiData.object.uploadedAt,
        } : undefined,
      };
    } catch (error: any) {
      let userMessage = '';
      
      if (error.logs && Array.isArray(error.logs)) {
        const logs = error.logs.join(' ').toLowerCase();
        if (logs.includes('allocate') && logs.includes('already in use')) {
          userMessage = 'This file has already been uploaded. Duplicate uploads are not allowed.';
        } else if (logs.includes('already used') || logs.includes('duplicate')) {
          userMessage = 'This file has already been uploaded previously.';
        }
      } else if (error.message) {
        const msg = error.message.toLowerCase();
        if (msg.includes('already in use') || msg.includes('duplicate')) {
          userMessage = 'This file has already been uploaded and paid for.';
        }
      }

      console.error('Error:', error);

      return {
        success: false,
        error: userMessage || error.message,
      };
    }
  }


  calculateEstimatedCost(file: File, durationDays: number) {
    const rate = 1000; // lamports per byte per day
    const lamports = file.size * durationDays * rate;
    return {
      lamports,
      sol: lamports / 1_000_000_000,
    };
  }


  async getTransactionHistory(address: string) {
    try {
      const res = await axios.get(`${this.apiBaseUrl}/transactions/${address}`);
      return res.data;
    } catch (error) {
      console.error('Failed to get transactions', error);
      return [];
    }
  }

  async getUploadedFiles(address: string) {
    try {
      const res = await axios.get(`${this.apiBaseUrl}/files/${address}`);
      return res.data;
    } catch (error) {
      console.error('Failed to get uploaded files', error);
      return [];
    }
  }
}


export const uploadService = new UploadService();

export const adminApi = {
  updateRate: async (rate: number, apiKey: string) => {
    const res = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/updateRate`, { rate }, { headers: { "x-api-key": apiKey }});
    return res.data;
  },
  updateMinDuration: async (minDuration: number, apiKey: string) => {
    const res = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/updateMinDuration`, { minDuration }, { headers: { "x-api-key": apiKey }});
    return res.data;
  },
};
