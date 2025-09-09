import { API_BASE_URL } from "../api";
import axios from "axios";

/**
 * Function to get user upload history
 * @param walletAddress 
 * @returns 
 */
export const getUserUploadHistory = async (walletAddress: string) => {
    
  const response = await axios.get(`${API_BASE_URL}/user/getUserUploadHistory`, {
    params: { walletAddress },
  });


  return response.data;
};