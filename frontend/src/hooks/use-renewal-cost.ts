import { Environment, useUpload } from "storacha-sol";
import useSWR from "swr";

export const useRenewalCost = (cid: string, duration: number) => {
  const client = useUpload("testnet" as Environment);
  const key = cid && duration ? ["renewal-cost", cid, duration] : null;
  const { data, error, isLoading } = useSWR(key, async () => {
    const renewalCost = await client.getStorageRenewalCost(cid, duration);
    return renewalCost;
  });

  return {
    data,
    error,
    isLoading,
  };
};

export const useUploadHistory = (walletAddress: string) => {
  const client = useUpload("testnet" as Environment);
  const key = walletAddress ? ["upload-history", walletAddress] : null;
  const { data, error, isLoading } = useSWR(key, async () => {
    const uploadHistory = await client.getUserUploadHistory(walletAddress);
    return uploadHistory;
  });

  return {
    data,
    error,
    isLoading,
  };
};

export const useFileDetails = (walletAddress: string, cid: string) => {
  const client = useUpload("testnet" as Environment);
  const key =
    walletAddress && cid ? ["file-details", walletAddress, cid] : null;
  const { data, error, isLoading } = useSWR(key, async () => {
    const response = await client.getUserUploadHistory(walletAddress);
    const file = response.userHistory?.find((f: any) => f.contentCid === cid);

    if (!file) {
      throw new Error("File not found in your upload history");
    }

    if (file.deletionStatus === "deleted") {
      throw new Error("This file has been deleted and cannot be renewed");
    }

    return file;
  });

  return {
    data,
    error,
    isLoading,
  };
};
