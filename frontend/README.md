# Storacha Frontend

A React-based frontend application for testing the Storacha Solana SDK backend API.

## Features

- **User Dashboard**: Test user endpoints including file upload, delegation creation, and quote generation
- **Admin Dashboard**: Test admin endpoints for updating rates and minimum duration settings
- **Responsive Design**: Clean, modern interface with dark theme support

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
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

## Environment Setup

Make sure your backend is running on `http://localhost:3000` before testing the frontend functionality.
