# Terms of Use

**Last Updated:** January 2026

## 1. Introduction

Welcome to toju ("we," "our," or "us"). toju is a payment bridge that enables users to pay for decentralized storage on IPFS via Storacha using cryptocurrency (SOL on Solana, with additional chains coming soon).

By using our service, you agree to these Terms of Use. Please read them carefully.

## 2. Service Description

toju is a **payment middleware layer** — we facilitate cryptocurrency payments for decentralized storage. We do not operate the underlying storage infrastructure. Your data is stored on IPFS (InterPlanetary File System) via Storacha's network, which utilizes Filecoin for long-term persistence.

**What we provide:**
- A bridge to pay for IPFS storage using cryptocurrency
- Upload orchestration and payment processing
- Content Identifiers (CIDs) for accessing your stored data
- Storage duration tracking and renewal capabilities

**What we do not provide:**
- The storage infrastructure itself (provided by Storacha/IPFS/Filecoin)
- Data encryption or privacy services
- Exclusive access to your stored content

## 3. Data Accessibility and Privacy

### 3.1 Public Nature of IPFS

> **IMPORTANT: Data stored on IPFS is publicly accessible.**

IPFS is a public, peer-to-peer network. Any data uploaded through our service can be accessed by anyone who has the Content Identifier (CID). There is no access control, encryption, or privacy layer provided by IPFS or by toju.

**You should NOT store:**
- Personal identification documents
- Financial information (bank statements, tax records)
- Medical or health records
- Passwords, private keys, or authentication credentials
- Confidential business information
- Any data protected by privacy regulations (GDPR, HIPAA, etc.)
- Any content you would not want publicly accessible

**By using our service, you acknowledge and accept that:**
- Your uploaded data will be publicly accessible to anyone with the CID
- Multiple IPFS nodes worldwide may cache and distribute your data
- We cannot guarantee the removal of data from the IPFS network
- You are solely responsible for the content you upload

### 3.2 Data Encryption

If you require privacy for your data, you must encrypt it **before** uploading. We do not provide encryption services. Any encryption is your responsibility.

## 4. Data Export and Retrieval

### 4.1 Your Data Remains Accessible

toju is a payment layer, not a data custodian. Your data is stored on the decentralized IPFS network, and you retain full access to it.

**How to access your data:**
- Every upload returns a Content Identifier (CID)
- Your data can be retrieved using any public IPFS gateway
- Example gateways: `https://w3s.link/ipfs/{CID}`, `https://ipfs.io/ipfs/{CID}`
- You can also run your own IPFS node to retrieve data directly

**We do not hold your data hostage.** Even if our service were to cease operations, your data would remain accessible via the IPFS network for as long as it is pinned by Storacha or other nodes.

### 4.2 CID Preservation

We strongly recommend that you:
- Save and backup all CIDs returned after uploads
- Keep records of your uploads independently
- Do not rely solely on our dashboard for CID storage

## 5. Storage Duration and Expiration

### 5.1 Pay-As-You-Go Model

Our service operates on a pay-as-you-go model. You pay for a specific storage duration when uploading files.

- Storage duration is measured in days
- Your files remain actively pinned for the duration you paid for
- You will receive email notifications before expiration (if you provided an email)
- You may renew storage before expiration to extend the duration

### 5.2 After Expiration

When your paid storage duration expires:
- We will unpin your files from Storacha's infrastructure
- Your data may remain accessible via IPFS for approximately 30 days due to network caching
- After the IPFS retention period, data availability is not guaranteed
- We are not responsible for data loss after expiration

## 6. Refund Policy

### 6.1 General Policy

Due to the nature of decentralized storage and cryptocurrency payments, **full refunds are not available** once data has been uploaded.

**Why refunds are limited:**
1. **Storage costs are immediate:** When you upload data, we immediately pay Storacha for the storage space. These costs cannot be recovered.
2. **IPFS network behavior:** Even if we delete your files from our pinning service, IPFS nodes across the network may continue to cache and serve your data for up to 30 days.
3. **Cryptocurrency transactions:** Blockchain transactions are irreversible by design.

### 6.2 Partial Refunds

We may offer partial refunds calculated based on unused storage duration:

```
Refund = (Remaining Days / Total Days) × Original Payment - Processing Fee
```

**Conditions for partial refunds:**
- Request must be made within 24 hours of upload
- Minimum remaining duration of 7 days
- Subject to a processing fee to cover transaction costs
- Approved at our sole discretion

### 6.3 No Refunds Available For

- Storage that has been fully consumed (time elapsed)
- Requests made after the storage period has expired
- Data that you voluntarily deleted
- Service dissatisfaction with IPFS network performance (outside our control)
- Failure to access data due to lost CIDs
- Cryptocurrency price fluctuations after payment

### 6.4 Requesting a Refund

To request a refund, open an issue on our [GitHub repository](https://github.com/seetadev/Storacha-Solana-SDK/issues) with:
- Your wallet address
- Transaction signature(s)
- CID(s) of the uploaded content
- Reason for the refund request

## 7. Acceptable Use Policy

### 7.1 Prohibited Content

You agree NOT to use our service to store, distribute, or facilitate:

**Illegal Content:**
- Child sexual abuse material (CSAM)
- Content that violates any applicable law
- Stolen data or data obtained through unauthorized access
- Content that infringes intellectual property rights

**Harmful Content:**
- Malware, viruses, or malicious code
- Phishing pages or scam materials
- Content promoting violence or terrorism
- Doxxing or harassment materials

**Regulatory Violations:**
- Content that violates GDPR, CCPA, or other privacy regulations
- Sanctions-violating transactions
- Money laundering or financial fraud materials

### 7.2 Your Responsibility

You are solely responsible for:
- Ensuring you have the right to upload content
- Compliance with all applicable laws in your jurisdiction
- Any consequences arising from your uploaded content

### 7.3 Our Rights

We reserve the right to:
- Refuse service to anyone at our discretion
- Unpin content that violates this policy without refund
- Report illegal content to appropriate authorities
- Cooperate with law enforcement investigations

*Note: Due to the decentralized nature of IPFS, removing content from our pinning service does not guarantee removal from the network.*

## 8. Feedback and Support

### 8.1 How to Reach Us

As an open-source project, we use GitHub for transparency and community engagement:

**For bug reports and feature requests:**
Open an issue at: [github.com/seetadev/Storacha-Solana-SDK/issues](https://github.com/seetadev/Storacha-Solana-SDK/issues)

**For documentation:**
Visit: [docs.toju.network](https://docs.toju.network)

**For general inquiries:**
Email: [support@toju.network](mailto:support@toju.network)

### 8.2 Response Times

We are a small team and cannot guarantee response times. Critical security issues will be prioritized.

## 9. Limitation of Liability

### 9.1 Service Provided "As Is"

Our service is provided "as is" without warranties of any kind, either express or implied.

**We do not guarantee:**
- Uninterrupted or error-free service
- Data availability or persistence beyond paid duration
- IPFS network performance or reliability
- Cryptocurrency price stability
- Compatibility with all wallets or browsers

### 9.2 Liability Cap

To the maximum extent permitted by law, our total liability for any claims arising from your use of the service shall not exceed the amount you paid us in the 12 months preceding the claim.

### 9.3 No Liability For

We are not liable for:
- Loss of data after storage expiration
- Data breaches resulting from IPFS's public nature
- Third-party access to your unencrypted data
- Cryptocurrency losses due to wallet compromise
- IPFS network outages or performance issues
- Storacha service interruptions

## 10. Indemnification

You agree to indemnify and hold harmless toju, its team members, and affiliates from any claims, damages, or expenses arising from:
- Your use of the service
- Content you upload
- Your violation of these terms
- Your violation of any third-party rights

## 11. Changes to Terms

We may update these Terms of Use at any time. Changes will be posted on this page with an updated "Last Updated" date.

**For significant changes:**
- We will make reasonable efforts to notify users (via email if provided)
- Continued use after changes constitutes acceptance

## 12. Governing Law

These terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.

## 13. Severability

If any provision of these terms is found unenforceable, the remaining provisions will continue in effect.

## 14. Contact

For questions about these Terms of Use:
- GitHub: [github.com/seetadev/Storacha-Solana-SDK](https://github.com/seetadev/Storacha-Solana-SDK)
- Email: [support@toju.network](mailto:support@toju.network)
- Website: [toju.network](https://toju.network)

---

By using toju, you acknowledge that you have read, understood, and agree to be bound by these Terms of Use.
