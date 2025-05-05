/**
 * Seed Script for User Journey Data
 * 
 * This script populates the database with sample user journey data
 * for development and testing purposes.
 * 
 * Usage: node seedJourneyData.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const { UserJourney, Session } = require('../models/UserJourney');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cryptique', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected for seeding'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Helper function to generate random date within range
const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Teams and websites for seeding
const teams = [
  { id: 'akshit', name: 'Akshit Team' },
  { id: 'crypto', name: 'Crypto Team' },
  { id: 'marketing', name: 'Marketing Team' }
];

const websites = [
  { id: 'CQ', name: 'CQ', domain: 'cryptique.com', teamId: 'akshit' },
  { id: 'demo-1', name: 'Demo Site 1', domain: 'demo1.com', teamId: 'akshit' },
  { id: 'wallet', name: 'Wallet App', domain: 'wallet.crypto.com', teamId: 'crypto' },
  { id: 'nft', name: 'NFT Marketplace', domain: 'nft.crypto.com', teamId: 'crypto' },
  { id: 'blog', name: 'Crypto Blog', domain: 'blog.crypto.com', teamId: 'marketing' }
];

// Seed database with user journey data
const seedDatabase = async () => {
  try {
    // Clear existing data
    await UserJourney.deleteMany({});
    await Session.deleteMany({});
    
    console.log('Cleared existing data');
    
    // Generate user journeys for each website
    for (const website of websites) {
      const userCount = Math.floor(Math.random() * 20) + 30; // 30-50 users per website
      console.log(`Generating ${userCount} users for ${website.name} (${website.id})`);
      
      for (let i = 1; i <= userCount; i++) {
        // Create date range (last 90 days)
        const now = new Date();
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        
        // Generate first visit date
        const firstVisitDate = randomDate(ninetyDaysAgo, now);
        
        // Generate last visit date (after first visit)
        const lastVisitDate = randomDate(firstVisitDate, now);
        
        // Determine conversion status
        const hasConverted = Math.random() > 0.6; // 40% conversion rate
        const totalSessions = Math.floor(Math.random() * 8) + 1; // 1-8 sessions
        
        // Create user journey
        const userJourney = new UserJourney({
          userId: `user_${website.id}_${i}_${Date.now().toString(36)}`,
          firstVisit: firstVisitDate,
          lastVisit: lastVisitDate,
          totalSessions: totalSessions,
          totalPageViews: Math.floor(Math.random() * 50) + 1,
          totalTimeSpent: Math.floor(Math.random() * 7200) + 300, // 5 min to 2 hrs in seconds
          hasConverted: hasConverted,
          daysToConversion: hasConverted ? Math.floor((lastVisitDate - firstVisitDate) / (1000 * 60 * 60 * 24)) : null,
          userSegment: hasConverted ? 'converter' : ['engaged', 'bounced', 'browser'][Math.floor(Math.random() * 3)],
          acquisitionSource: ['google/organic', 'facebook/social', 'twitter/social', 'direct'][Math.floor(Math.random() * 4)],
          sessionsBeforeConversion: hasConverted ? Math.floor(Math.random() * totalSessions) + 1 : null,
          teamId: website.teamId,
          siteId: website.id,
          websiteName: website.name,
          websiteDomain: website.domain
        });
        
        await userJourney.save();
        
        // Generate sessions for this user
        const sessionCount = totalSessions;
        const sessionDates = [];
        
        // Generate session dates between first and last visit
        for (let j = 0; j < sessionCount; j++) {
          sessionDates.push(randomDate(firstVisitDate, lastVisitDate));
        }
        
        // Sort session dates
        sessionDates.sort((a, b) => a - b);
        
        // Create sessions
        for (let j = 0; j < sessionCount; j++) {
          // Session duration between 1 and 60 minutes
          const sessionDuration = Math.floor(Math.random() * 3600) + 60;
          
          // Pages viewed, between 1 and 10
          const pagesViewed = Math.floor(Math.random() * 10) + 1;
          
          // Generate visited pages
          const visitedPages = [];
          const possiblePaths = [
            '/', 
            '/about', 
            '/features', 
            '/pricing', 
            '/contact', 
            '/blog', 
            '/products',
            '/documentation',
            '/login',
            '/dashboard'
          ];
          
          for (let k = 0; k < pagesViewed; k++) {
            const path = possiblePaths[Math.floor(Math.random() * possiblePaths.length)];
            const pageTimestamp = new Date(sessionDates[j]);
            pageTimestamp.setMinutes(pageTimestamp.getMinutes() + Math.floor(Math.random() * (sessionDuration / 60)));
            
            visitedPages.push({
              path,
              timestamp: pageTimestamp,
              duration: Math.floor(Math.random() * 300) + 10, // 10 seconds to 5 minutes
              isEntry: k === 0,
              isExit: k === pagesViewed - 1
            });
          }
          
          // Sort pages by timestamp
          visitedPages.sort((a, b) => a.timestamp - b.timestamp);
          
          // Create random device info
          const deviceTypes = ['desktop', 'mobile', 'tablet'];
          const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge'];
          const oss = ['Windows', 'macOS', 'iOS', 'Android'];
          
          // Determine if wallet is connected (only if user has converted and it's the conversion session)
          const isConversionSession = hasConverted && 
                                    j + 1 === userJourney.sessionsBeforeConversion;
          
          const session = new Session({
            sessionId: `sess_${userJourney.userId}_${j}_${Date.now().toString(36)}`,
            userId: userJourney.userId,
            sessionNumber: j + 1,
            startTime: sessionDates[j],
            duration: sessionDuration,
            pagesViewed: pagesViewed,
            visitedPages: visitedPages,
            device: {
              type: deviceTypes[Math.floor(Math.random() * deviceTypes.length)],
              browser: browsers[Math.floor(Math.random() * browsers.length)],
              os: oss[Math.floor(Math.random() * oss.length)]
            },
            wallet: isConversionSession ? {
              walletAddress: `0x${[...Array(40)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
              walletType: ['MetaMask', 'Coinbase Wallet', 'Phantom', 'WalletConnect'][Math.floor(Math.random() * 4)],
              chainName: ['Ethereum', 'Polygon', 'Solana', 'Avalanche'][Math.floor(Math.random() * 4)]
            } : {
              walletAddress: 'No Wallet Detected',
              walletType: null,
              chainName: null
            },
            country: ['US', 'UK', 'CA', 'DE', 'FR', 'JP', 'IN'][Math.floor(Math.random() * 7)],
            referrer: Math.random() > 0.5 ? ['google.com', 'facebook.com', 'twitter.com', 'linkedin.com'][Math.floor(Math.random() * 4)] : null,
            utmData: Math.random() > 0.7 ? {
              source: ['google', 'facebook', 'twitter', 'email'][Math.floor(Math.random() * 4)],
              medium: ['cpc', 'social', 'email', 'referral'][Math.floor(Math.random() * 4)],
              campaign: `campaign-${Math.floor(Math.random() * 5) + 1}`
            } : null,
            siteId: website.id,
            teamId: website.teamId
          });
          
          await session.save();
        }
      }
    }
    
    console.log('Database seeded successfully!');
    
    // Count total documents
    const journeyCount = await UserJourney.countDocuments();
    const sessionCount = await Session.countDocuments();
    
    console.log(`Created ${journeyCount} user journeys and ${sessionCount} sessions`);
    console.log('Seed complete!');
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    mongoose.connection.close();
    process.exit(1);
  }
};

// Run the seed function
seedDatabase(); 