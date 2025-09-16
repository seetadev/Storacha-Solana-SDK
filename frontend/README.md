# Storacha Frontend

A React-based frontend application for testing the Storacha Solana SDK backend API.

## Features

- **User Dashboard**: Test user endpoints including file upload, delegation creation, and quote generation
- **Admin Dashboard**: Test admin endpoints for updating rates and minimum duration settings
- **Responsive Design**: Clean, modern interface with dark theme support
- Real Solana deposit transaction integration with API interaction
- Custom, themed wallet connect modal (dark and light themes)
- Responsive dashboard with uploaded files, search, filters, and transaction history
- Downloadable & printable storage receipts per upload
- Multiple professional background images for brand consistency
- Wallet disconnect buttons and real-time cost calculations
- Toast notifications and progress indicator for seamless UX

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Use the local sdk package
```bash
cd sdk && pnpm pack
```

3. Add the `NEXT_PUBLIC_API_BASE_URL` in `.env`:
```bash
NEXT_PUBLIC_API_BASE_URL="https://storacha-solana-sdk-bshc.onrender.com/api"
```

4. Start the development server:
```bash
pnpm dev
```


The frontend will be available at `http://localhost:5173` and will proxy API requests to the backend at `http://localhost:3000`.

## API Endpoints Tested

### User Endpoints
- `POST /api/user/uploadFile` - Upload files to Storacha
- `POST /api/user/createDelegation` - Create UCAN delegations
- `GET /api/user/getQuote` - Get storage quotes

### Admin Endpoints
- `POST /api/admin/updateRate` - Update storage rates (requires API key)
- `POST /api/admin/updateMinDuration` - Update minimum duration (requires API key)

## Usage

1. **User Dashboard**: Navigate to `/user` to test user-facing functionality
2. **Admin Dashboard**: Navigate to `/admin` to test admin functionality (requires valid API key)
3. Connect your Solana wallet via the custom modal, select files for upload, configure storage duration, and deposit SOL using real transactions. View your uploaded files and receipts on the dashboard.

## Project Structure

- `src/app`: Next.js app route files including home, upload, dashboard
- `src/components`: Reusable components like WalletConnection, FileUpload, ReceiptModal
- `src/contexts`: Wallet context for real-time wallet state and balance tracking
- `src/services`: Upload service handling API interaction and Solana transactions
- `src/utils`: Helper functions for formatting and calculations
- `public/images`: Background images for theming

## Environment Setup

Make sure your backend is running on `https://storacha-solana-sdk-bshc.onrender.com/` before testing the frontend functionality.
