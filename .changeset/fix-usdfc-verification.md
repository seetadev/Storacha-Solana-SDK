---
"@toju.network/fil": patch
---

fix: replace beryx indexer with direct onchain rpc verification for usdfc payments

- replaced beryx indexer dependency with direct filecoin rpc verification via `eth_getTransactionReceipt`
- added receipt polling (5s intervals, 120s timeout) to handle filecoin's ~30s block times
- fixed `verifyPayment` error message to read server response `message` property instead of defaulting to generic error
- fixed success modal to show correct payment chain (SOL vs USDFC) instead of always showing SOL
- added shared `UploadResultInfo` type to avoid type duplication between upload and success modal
