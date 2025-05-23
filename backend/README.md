# Cryptique Backend

This is the backend server for the Cryptique application, handling authentication, analytics, and API endpoints.

## Environment Variables

This application requires the following environment variables to be set in a `.env` file in the root directory of the backend project or in your deployment platform (e.g., Vercel):

```
# Required
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
GEMINI_API=your_gemini_api_key

# Blockchain APIs (for onchain data)
DUNE_API_KEY=your_dune_api_key

# Port (optional, defaults to 3001)
PORT=3001

# Email configuration for sending OTPs
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

**Important**: Never commit your `.env` file to version control. Make sure to add it to `.gitignore`.

## Security Features

The application includes the following security features:

1. **MongoDB Security**:
   - Secure connection with SSL/TLS in production
   - Authentication required with username and password
   - Connection pool management to prevent resource exhaustion
   - Timeout settings to prevent slow connection attacks
   - Write and read concern configurations for data integrity
   - Automatic reconnection with retries for stability

2. **Rate Limiting**:
   - General API rate limiting: 100 requests per 15 minutes per IP address
   - Authentication endpoints (signup, login): 10 requests per hour per IP address
   - Failed login attempts: 5 failed attempts per hour per IP address

3. **JWT Authentication**:
   - Tokens expire after 2 hours
   - Uses a secure secret key for signing

4. **Password Security**:
   - Passwords are hashed using bcrypt with 10 rounds
   - OTP verification for email authentication

5. **CORS Protection**:
   - Strict CORS settings for main application routes
   - SDK routes have special CORS settings to allow for cross-origin tracking

6. **Content Security Policy (CSP)**:
   - Strict CSP headers to prevent XSS attacks
   - Restricts which resources can be loaded and from where
   - Configures frame protection, script sources, and other security policies

7. **Additional Security Headers**:
   - X-Content-Type-Options: Prevents MIME type sniffing
   - X-Frame-Options: Prevents clickjacking attacks
   - X-XSS-Protection: Additional XSS protection
   - Strict-Transport-Security (HSTS): Enforces HTTPS connections
   - Referrer-Policy: Controls what information is shared in referrer headers

## Getting Started

1. Install dependencies:
```
npm install
```

2. Create a `.env` file with the required environment variables.

3. Start the development server:
```
npm run dev
```

## API Routes

- **Authentication**: `/api/auth`
- **Team Management**: `/api/team`
- **SDK Integration**: `/api/sdk`
- **Website Management**: `/api/website`
- **Analytics**: `/api/analytics`
- **On-chain Data**: `/api/onchain`
- **Campaigns**: `/api/campaign`
- **Smart Contracts**: `/api/contracts`
- **Transactions**: `/api/transactions`
- **AI Integration**: `/api/ai`

## Deployment

The backend is configured for deployment on Vercel using the `vercel.json` configuration file. 