export const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

export const USDFC_ADDRESSES = {
  mainnet: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  calibration: "0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0",
} as const;

const ENDPOINTS = {
  local: "http://localhost:5040",
  staging: "https://staging-api.toju.network",
  production: "https://api.toju.network",
} as const;

export function getEndpointForNetwork(
  network: "mainnet" | "calibration" | "local",
): string {
  switch (network) {
    case "mainnet":
      return ENDPOINTS.production;
    case "calibration":
      return ENDPOINTS.staging;
    case "local":
      return ENDPOINTS.local;
    default:
      return ENDPOINTS.production;
  }
}

export const DAY_TIME_IN_SECONDS = 86400;
