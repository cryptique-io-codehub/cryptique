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
```

**Important**: Never commit your `.env` file to version control. Make sure to add it to `.gitignore`.

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