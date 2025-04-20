# Gavshala Donation Platform - Backend Server

This is the backend server for the Gavshala donation platform, which integrates Razorpay payment processing with a React frontend and Node.js backend, using Supabase for database management.

## Features

- Razorpay payment integration
- User account management
- Donation processing and verification
- Secure webhook handling
- Local storage fallback for Supabase RLS issues

## Tech Stack

- Node.js with Express
- Supabase for database
- Razorpay payment gateway
- JWT authentication

## Environment Variables

The following environment variables are required:

```
NODE_ENV=production
PORT=3001
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret
```

## Deployment Instructions

### Deploy to Render.com

1. Fork or clone this repository
2. Create a new Web Service on Render.com
3. Connect your GitHub repository
4. Use the following settings:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Add the required environment variables in the Render dashboard
6. Deploy the service

### Manual Deployment

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with the required environment variables
4. Start the server: `node server.js`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login a user
- `GET /api/auth/me` - Get current user info

### Donations
- `POST /api/donations` - Create a new donation
- `POST /api/donations/create-sdk-order` - Create a Razorpay order
- `GET /api/donations/payment-status` - Check payment status
- `POST /api/donations/callback` - Razorpay webhook callback
- `POST /api/donations/:id/refund` - Initiate a refund
- `GET /api/donations/:id/refund-status` - Check refund status
- `PATCH /api/donations/:id/status` - Update donation status

## Frontend Integration

The frontend should be deployed separately and configured to connect to this backend API. Set the `REACT_APP_API_URL` environment variable in your frontend to point to this deployed backend URL.

## Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with the required environment variables
4. Start the development server: `npm run dev`

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.
