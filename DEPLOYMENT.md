# Deployment Guide for Gavshala Donation Platform

This guide explains how to deploy the Gavshala Donation Platform to production at https://donate.gomantakgausevak.com/.

## Prerequisites

- Node.js (v14+)
- npm or yarn
- Access to your production server
- Domain configured to point to your server

## Build Process

### 1. Build the Frontend

```bash
# Navigate to the project root
cd react-tailwind-css-starter-pack-main

# Install dependencies if needed
npm install

# Build the production version
npm run build
```

This will create a `build` folder with optimized production files.

### 2. Prepare the Server

Make sure your server has all the required environment variables:

```
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_live_1newjMgO58r6X3
RAZORPAY_KEY_SECRET=OZLrpslZHdPNPzLDOkWfexiR
RAZORPAY_WEBHOOK_SECRET=OZLrpslZHdPNPzLDOkWfexiR

# Supabase Configuration
SUPABASE_URL=https://xcdyletgoabaxznsthqj.supabase.co
SUPABASE_KEY=your_supabase_key

# Server Configuration
PORT=3001
NODE_ENV=production
JWT_SECRET=your_secure_jwt_secret

# Frontend URL
FRONTEND_URL=https://donate.gomantakgausevak.com
```

### 3. Deploy to Production Server

#### Option 1: Manual Deployment

1. Copy the `build` folder to your server
2. Copy the `server` folder to your server
3. Install server dependencies and start the server:

```bash
cd server
npm install
NODE_ENV=production npm start
```

#### Option 2: Using PM2 (Recommended)

PM2 is a process manager for Node.js applications that helps keep your app running.

```bash
# Install PM2 globally
npm install -g pm2

# Start the server with PM2
cd server
pm2 start server.js --name "gavshala-donation" --env production

# Make PM2 start on system reboot
pm2 startup
pm2 save
```

### 4. Configure Nginx (Recommended)

If you're using Nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name donate.gomantakgausevak.com www.donate.gomantakgausevak.com;

    # Redirect HTTP to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name donate.gomantakgausevak.com www.donate.gomantakgausevak.com;

    # SSL configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # Proxy to Node.js server
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. Configure Razorpay Webhook

In your Razorpay dashboard:

1. Go to Settings > Webhooks
2. Add a new webhook with URL: `https://donate.gomantakgausevak.comhttps://gomantabackend.onrender.com/api/donations/webhook`
3. Select events: `payment.captured`, `payment.failed`
4. Set the secret as your `RAZORPAY_WEBHOOK_SECRET`

## Troubleshooting

### Common Issues

1. **API Connection Issues**: Make sure the frontend is correctly connecting to the API. Check browser console for errors.

2. **CORS Errors**: Verify that your CORS configuration in `server.js` includes your domain.

3. **Payment Failures**: Check Razorpay dashboard for payment logs and ensure your API keys are correct.

4. **Database Connection Issues**: Verify your Supabase connection and RLS policies.

### Logs

Check server logs for errors:

```bash
# If using PM2
pm2 logs gavshala-donation
```

## Maintenance

### Updating the Application

1. Pull the latest code
2. Rebuild the frontend: `npm run build`
3. Restart the server: `pm2 restart gavshala-donation`

### Monitoring

Consider setting up monitoring for your application:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## Security Considerations

1. Keep your environment variables secure
2. Regularly update dependencies
3. Implement rate limiting for API endpoints
4. Set up proper logging and monitoring
5. Configure SSL properly
6. Regularly backup your database
