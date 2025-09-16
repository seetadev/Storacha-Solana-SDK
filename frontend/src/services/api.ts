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
      formData.append("duration", String(durationDays * 86400)); // Convert to seconds
      formData.append("publicKey", publicKey.toBase58());

      const uploadResponse = await fetch(`${this.apiBaseUrl}/user/uploadFile`, {
        method: "POST",
        body: formData,
      });

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
        throw new Error('Invalid JSON response from API');
      }

      console.log('✅ Parsed API response:', apiData);

      // Validate the response structure
      if (!apiData.instructions || !Array.isArray(apiData.instructions)) {
        console.error('❌ Invalid instructions:', apiData.instructions);
        throw new Error("Invalid instructions format in API response");
      }

      if (apiData.instructions.length === 0) {
        throw new Error("No transaction instructions received from API");
      }

      const instruction = apiData.instructions[0];
      console.log('🔍 First instruction:', instruction);

      // Validate instruction structure
      if (!instruction.programId) {
        throw new Error("Missing programId in instruction");
      }

      if (!instruction.keys || !Array.isArray(instruction.keys)) {
        console.error('❌ Invalid keys structure:', instruction.keys);
        throw new Error("Invalid keys format in instruction");
      }

      if (!instruction.data) {
        throw new Error("Missing data in instruction");
      }

      console.log('🔑 Instruction keys:', instruction.keys);
      console.log('📋 Program ID:', instruction.programId);
      console.log('📦 Data length:', instruction.data.length);

      // Step 2: Build Solana transaction from API response
      console.log('🔨 Building Solana transaction...');
      const latestBlockhash = await this.connection.getLatestBlockhash("confirmed");

      // Validate and convert keys
      const transactionKeys = instruction.keys.map((key, index) => {
        console.log(`🔑 Processing key ${index}:`, key);

        if (!key.pubkey) {
          throw new Error(`Missing pubkey in key ${index}`);
        }

        if (typeof key.isSigner !== 'boolean') {
          throw new Error(`Invalid isSigner value in key ${index}: ${key.isSigner}`);
        }

        if (typeof key.isWritable !== 'boolean') {
          throw new Error(`Invalid isWritable value in key ${index}: ${key.isWritable}`);
        }

        try {
          return {
            pubkey: new PublicKey(key.pubkey),
            isSigner: key.isSigner,
            isWritable: key.isWritable,
          };
        } catch (pubkeyError) {
          console.error(`❌ Invalid pubkey in key ${index}:`, key.pubkey, pubkeyError);
          throw new Error(`Invalid pubkey in key ${index}: ${key.pubkey}`);
        }
      });

      console.log('✅ Converted transaction keys:', transactionKeys);

      // Convert data from base64
      let instructionData: Buffer;
      try {
        instructionData = Buffer.from(instruction.data, "base64");
        console.log('✅ Converted instruction data, length:', instructionData.length);
      } catch (dataError) {
        console.error('❌ Invalid base64 data:', instruction.data, dataError);
        throw new Error('Invalid base64 data in instruction');
      }

      // Create the transaction instruction
      const depositIx = new TransactionInstruction({
        programId: new PublicKey(instruction.programId),
        keys: transactionKeys,
        data: instructionData,
      });

      console.log('✅ Transaction instruction created');

      const transaction = new Transaction();
      transaction.recentBlockhash = latestBlockhash.blockhash;
      transaction.feePayer = publicKey;
      transaction.add(depositIx);

      console.log('📝 Transaction built, requesting signature...');

      // Step 3: Sign transaction
      const signedTransaction = await signTransaction(transaction);
      console.log('✅ Transaction signed');

      // Step 4: Send transaction
      console.log('📡 Sending transaction to network...');
      const signature = await this.connection.sendRawTransaction(
        signedTransaction.serialize(),
        {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        }
      );

      console.log('📋 Transaction sent with signature:', signature);

      // Step 5: Confirm transaction
      console.log('⏳ Confirming transaction...');
      const confirmation = await this.connection.confirmTransaction(
        {
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        },
        "confirmed"
      );

      if (confirmation.value.err) {
        console.error('❌ Transaction confirmation error:', confirmation.value.err);
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log('🎉 Transaction confirmed successfully!');

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
    } catch (error) {
      console.error("💥 Upload error:", error);

      // More detailed error reporting
      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  calculateEstimatedCost(file: File, durationDays: number) {
    const ratePerBytePerDay = 1000; // lamports per byte per day
    const sizeBytes = file.size;
    const totalLamports = sizeBytes * durationDays * ratePerBytePerDay;
    const totalSOL = totalLamports / 1_000_000_000;

    return {
      lamports: totalLamports,
      sol: totalSOL,
    };
  }

  async getTransactionHistory(publicKey: string) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/transactions/${publicKey}`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch transaction history:", error);
      return [];
    }
  }

  async getUploadedFiles(publicKey: string) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/files/${publicKey}`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch uploaded files:", error);
      return [];
    }
  }
}

export const uploadService = new UploadService();


export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5040/api";

export const adminApi = {
  updateRate: async (rate: number, apiKey: string) => {
    const response = await axios.post(
      `${API_BASE_URL}/admin/updateRate`,
      { rate },
      {
        headers: {
          "x-api-key": apiKey,
        },
      }
    );
    return response.data;
  },

  updateMinDuration: async (minDuration: number, apiKey: string) => {
    const response = await axios.post(
      `${API_BASE_URL}/admin/updateMinDuration`,
      { minDuration },
      {
        headers: {
          "x-api-key": apiKey,
        },
      }
    );
    return response.data;
  },
};
