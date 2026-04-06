# Changelog

## 1.0.0

### Major Changes

- upload flow now pins to pinata at deposit time — the file upload step after confirm is no longer needed and has been removed

  breaking: deposit response no longer includes depositMetadata
  breaking: confirm no longer accepts depositMetadata in the request body
  breaking: url is now returned from the confirm/verify-payment response instead of the file upload response

## 0.2.2

### Patch Changes

- 8822b5f: add optional directoryName field to CreateDepositArgs for preserving directory names during multi-file uploads. previously, directory uploads saved fileName as null in the database, causing "Unknown File" to display in upload history. the UI now extracts the directory name from webkitRelativePath and passes it through the SDK to the server.

## 0.2.1

### Patch Changes

- cc2bbff: fix: set payment_chain and payment_token explicitly for SOL deposits, update package READMEs

## 0.2.0

### Minor Changes

- 8a6af5b: add storage renewal support (`getStorageRenewalCost`, `renewStorageDuration`) and guard deposit flow against duplicate CID uploads

## 0.1.2

### Patch Changes

- f0e3bbf: fix: replace beryx indexer with direct onchain rpc verification for usdfc payments
  - replaced beryx indexer dependency with direct filecoin rpc verification via `eth_getTransactionReceipt`
  - added receipt polling (5s intervals, 120s timeout) to handle filecoin's ~30s block times
  - fixed `verifyPayment` error message to read server response `message` property instead of defaulting to generic error
  - fixed success modal to show correct payment chain (SOL vs USDFC) instead of always showing SOL
  - added shared `UploadResultInfo` type to avoid type duplication between upload and success modal

## 0.1.1

### Patch Changes

- fix package exports for vite/vercel builds. added module and require fields, fixed types ordering, removed self-referencing dependency.

All notable changes to this project will be documented in this file.

## 0.1.0 (2026-02-18)

### Features

- initialize filecoin SDK base structure (#178)
- initialize filecoin ethers provider setup (#183)
- add the ability to deposit USDFC (#179)
- add ability to make USDFC deposits by updating the fil module methods (#188)
- add USDFC payment verification endpoint (#180)
- fil/usdfc payment support in ui (#189)

### Bug Fixes

- fixed an issue with halfway upload flow using USDFC where it just stops at verify-payment (#190)
