import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

// User API calls
export const userApi = {
  uploadFile: async (
    formData: FormData,
    publicKey?: string,
    balance?: number
  ) => {
    const response = await axios.post(
      `${API_BASE_URL}/user/uploadFile`,
      formData,
      {
        headers: {
          ...(publicKey && {
            "x-solana-pubkey": publicKey,
            "x-solana-network": "devnet",
            ...(balance !== undefined && {
              "x-solana-balance": balance.toString(),
            }),
          }),
        },
      }
    );
    return response.data;
  },

  createDelegation: async (data: {
    storachaKey: string;
    proof: string;
    fileCID: string;
    recipientDID: string;
    deadline: string;
    notBefore: string;
    baseCapabilities: string[];
  }) => {
    const response = await axios.post(
      `${API_BASE_URL}/user/createDelegation`,
      data
    );
    return response.data;
  },

  getQuote: async (sizeInBytes: number, durationInUnits: number) => {
    const response = await axios.get(`${API_BASE_URL}/user/getQuote`, {
      params: { size: sizeInBytes, duration: durationInUnits },
    });
    return response.data;
  },
};

// Admin API calls
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

export default { userApi, adminApi };
