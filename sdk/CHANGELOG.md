# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### 0.0.3 (2025-09-27)


### Features

* Add Cargo.lock for reproducible builds ([5de5dd0](https://github.com/seetadev/storacha-solana-sdk/commit/5de5dd0791c8884afb2ebfdd4e7b1d7e79575f57))
* add CID and recipient DID fields ([8002522](https://github.com/seetadev/storacha-solana-sdk/commit/8002522abcb22d2f1402a152e80d36fa830d847a))
* add createDepositTxn and a scaffold for the server integration ([1037d86](https://github.com/seetadev/storacha-solana-sdk/commit/1037d86855d3562b65ac898b0efc770a9a393e25))
* add frontend test ([5bad75d](https://github.com/seetadev/storacha-solana-sdk/commit/5bad75d36213a202c91c54b8a7dc0967aea7ea52))
* Add Solana payment program structure ([369da48](https://github.com/seetadev/storacha-solana-sdk/commit/369da48cc01a513b4d2895d601afcabf2bcf005a))
* Add solana-programs minimal version ([2dfb761](https://github.com/seetadev/storacha-solana-sdk/commit/2dfb7616e05a079c0826a164431f0572154e5ed9))
* added backend solana deposit route. ([#10](https://github.com/seetadev/storacha-solana-sdk/issues/10)) ([d25c355](https://github.com/seetadev/storacha-solana-sdk/commit/d25c355b4865c3bd842eed423a7b1d91ad860007))
* Added missing linear reward release mechanism and escrow ([8359396](https://github.com/seetadev/storacha-solana-sdk/commit/835939696013bae2b0102ba5119b8961ef59469b))
* content update and error handling to show appropriate errors on frontend ([#27](https://github.com/seetadev/storacha-solana-sdk/issues/27)) ([0b8ad4e](https://github.com/seetadev/storacha-solana-sdk/commit/0b8ad4e83dac879be33fa0d195636648c6fe96ed)), closes [#22](https://github.com/seetadev/storacha-solana-sdk/issues/22)
* expose client sdk via a react hook ([#29](https://github.com/seetadev/storacha-solana-sdk/issues/29)) ([d63aa3b](https://github.com/seetadev/storacha-solana-sdk/commit/d63aa3b74ee0c1ff9c0cc08f0c4bcb2aa1e22874))
* frontend re-design  ([#26](https://github.com/seetadev/storacha-solana-sdk/issues/26)) ([aaf4e2f](https://github.com/seetadev/storacha-solana-sdk/commit/aaf4e2fb64f72122a28a8d97b4c14d0b9a9ba8f6)), closes [#22](https://github.com/seetadev/storacha-solana-sdk/issues/22)
* get SOL deposits working ([5cf0f94](https://github.com/seetadev/storacha-solana-sdk/commit/5cf0f94f9f10889c68e21a33e0cbe70bf5517915))
* migrate to pnpm ([7efb80e](https://github.com/seetadev/storacha-solana-sdk/commit/7efb80e4e005d2ba81aedec4561c806a7f3b28ab))
* port frontend to Next and Tailwind, for easier customisation moving forward ([81d035f](https://github.com/seetadev/storacha-solana-sdk/commit/81d035f9d0ee31aab1a5ae08b1afdb8618cb556d))
* **sdk:** allow multiple file uploads via uploadDirectory. ([46901b7](https://github.com/seetadev/storacha-solana-sdk/commit/46901b74af82f03a46835d6e7272109eec2de697))
* setup sdk ([5c57b57](https://github.com/seetadev/storacha-solana-sdk/commit/5c57b5700dc703e3522cae37ba97323c2f1bae43))
* setup sdk ([#1](https://github.com/seetadev/storacha-solana-sdk/issues/1)) ([1ea7225](https://github.com/seetadev/storacha-solana-sdk/commit/1ea7225903383e19089a933837ee1a9bffe01207))
* Updated sdk with backend API ([#19](https://github.com/seetadev/storacha-solana-sdk/issues/19)) ([5597cd6](https://github.com/seetadev/storacha-solana-sdk/commit/5597cd6bffcbda7d042732e8ca01171977570522))


### Bug Fixes

* add correct endpoint URL in production and bump sdk version ([#37](https://github.com/seetadev/storacha-solana-sdk/issues/37)) ([b55f7d7](https://github.com/seetadev/storacha-solana-sdk/commit/b55f7d7adae7a7fa3c8e240e41b6af59f8b58aae))
* add frontend test ([4625aeb](https://github.com/seetadev/storacha-solana-sdk/commit/4625aeb476147f8eeff6296e22e5dfabab314b76))
* compute file CID with ipfs-car before upload ([072c49d](https://github.com/seetadev/storacha-solana-sdk/commit/072c49d589c4a0d8c8db5f8c63256e0f79c3ee51))
* correct implementation for pre-computed CIDs of directories uploaded ([37f1417](https://github.com/seetadev/storacha-solana-sdk/commit/37f141795e973a7d9791f70fa275232fa94bcfbe))
* defer IDL loading to environment variable ([67570ed](https://github.com/seetadev/storacha-solana-sdk/commit/67570ed8b1990109cc24cfd7d22822c913444d69))
* deposit-upload transaction flow ([#35](https://github.com/seetadev/storacha-solana-sdk/issues/35)) ([b9e1805](https://github.com/seetadev/storacha-solana-sdk/commit/b9e180531820139cf8e7047d3da9cc9a3689bee4))
* fixed a bug where a very low rate_per_byte results in failed uploads ([#24](https://github.com/seetadev/storacha-solana-sdk/issues/24)) ([1cae791](https://github.com/seetadev/storacha-solana-sdk/commit/1cae7914e3b7b5389fd86cbd8b88460e8bf68214))
* load program IDL and keypair with environment variable in prod ([#13](https://github.com/seetadev/storacha-solana-sdk/issues/13)) ([9427e09](https://github.com/seetadev/storacha-solana-sdk/commit/9427e0981bdb5ab03fcd27d47345450014912f55))
* prevent deposits when wallet balance is lesser than storage cost ([#28](https://github.com/seetadev/storacha-solana-sdk/issues/28)) ([a4f672b](https://github.com/seetadev/storacha-solana-sdk/commit/a4f672b1ac09b4509731d53d0a3f517bc9980243))
