const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt for input
function prompt(question, defaultValue = '') {
  return new Promise((resolve) => {
    const questionText = defaultValue 
      ? `${colors.cyan}${question} ${colors.dim}(${defaultValue})${colors.reset}${colors.cyan}: ${colors.reset}`
      : `${colors.cyan}${question}: ${colors.reset}`;
      
    rl.question(questionText, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

// Main function
async function setupRagEnv() {
  console.log(colors.green + '\n=== RAG Service Setup ===' + colors.reset);
  console.log('This script will help you set up the environment variables needed for the RAG service.\n');
  
  // Check if .env file exists
  const envPath = path.join(__dirname, '..', '.env');
  const envExamplePath = path.join(__dirname, '..', '.env.example');
  
  let envVars = {};
  
  // Load existing .env file if it exists
  if (fs.existsSync(envPath)) {
    console.log(colors.yellow + 'Found existing .env file. Current values will be used as defaults.' + colors.reset);
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        // Remove quotes if present
        envVars[key] = value.replace(/^['"](.*)['"]$/, '$1');
      }
    });
  } else if (fs.existsSync(envExamplePath)) {
    console.log(colors.yellow + 'Using .env.example as a template.' + colors.reset);
    const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
    envExampleContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        // Remove quotes if present
        envVars[key] = value.replace(/^['"](.*)['"]$/, '$1');
      }
    });
  }
  
  // Required environment variables for RAG service
  const requiredVars = [
    {
      name: 'PINECONE_API_KEY',
      description: 'Your Pinecone API key',
      default: envVars.PINECONE_API_KEY || ''
    },
    {
      name: 'PINECONE_ENVIRONMENT',
      description: 'Your Pinecone environment (e.g., us-west1-gcp)',
      default: envVars.PINECONE_ENVIRONMENT || ''
    },
    {
      name: 'GEMINI_API_KEY',
      description: 'Your Google Gemini API key',
      default: envVars.GEMINI_API_KEY || ''
    },
    {
      name: 'MONGODB_URI',
      description: 'MongoDB connection string',
      default: envVars.MONGODB_URI || 'mongodb://localhost:27017/cryptique'
    },
    {
      name: 'NODE_ENV',
      description: 'Node environment (development, production, etc.)',
      default: envVars.NODE_ENV || 'development'
    },
    {
      name: 'API_BASE_URL',
      description: 'Base URL for the API',
      default: envVars.API_BASE_URL || 'http://localhost:3000'
    },
    {
      name: 'RAG_INDEX_NAME',
      description: 'Name of the Pinecone index for RAG',
      default: envVars.RAG_INDEX_NAME || 'cryptique-rag-index'
    },
    {
      name: 'RAG_NAMESPACE',
      description: 'Namespace for RAG vectors in Pinecone',
      default: envVars.RAG_NAMESPACE || 'default'
    },
    {
      name: 'RAG_EMBEDDING_MODEL',
      description: 'Model to use for embeddings',
      default: envVars.RAG_EMBEDDING_MODEL || 'text-embedding-004'
    },
    {
      name: 'RAG_GENERATION_MODEL',
      description: 'Model to use for generation',
      default: envVars.RAG_GENERATION_MODEL || 'gemini-1.5-pro'
    },
    {
      name: 'RAG_MAX_TOKENS',
      description: 'Maximum number of tokens in generated responses',
      default: envVars.RAG_MAX_TOKENS || '1000'
    },
    {
      name: 'RAG_TEMPERATURE',
      description: 'Temperature for generation (0.0 to 1.0)',
      default: envVars.RAG_TEMPERATURE || '0.7'
    }
  ];
  
  // Prompt for each required variable
  console.log('\n' + colors.blue + 'Please provide the following information:' + colors.reset);
  
  for (const variable of requiredVars) {
    envVars[variable.name] = await prompt(
      variable.description,
      variable.default
    );
  }
  
  // Build the .env file content
  let envContent = `# RAG Service Configuration\n`;
  envContent += `# Generated on ${new Date().toISOString()}\n\n`;
  
  // Add all environment variables
  for (const [key, value] of Object.entries(envVars)) {
    // Quote values that contain spaces or special characters
    const formattedValue = /[\s"'`$&|<>]/.test(value) 
      ? `"${value.replace(/"/g, '\\"')}"` 
      : value;
    envContent += `${key}=${formattedValue}\n`;
  }
  
  // Write the .env file
  fs.writeFileSync(envPath, envContent);
  
  console.log(\`\n${colors.green}✅ Successfully created/updated ${envPath}${colors.reset}\`);
  
  // Check if we should initialize the RAG service
  const shouldInitialize = await prompt('\nWould you like to initialize the RAG service with sample data? (y/n)', 'y');
  
  if (shouldInitialize.toLowerCase() === 'y') {
    console.log('\n' + colors.blue + 'Initializing RAG service with sample data...' + colors.reset);
    try {
      // Run the initialization script
      execSync('node scripts/initRagService.js', { stdio: 'inherit' });
      console.log(colors.green + '\n✅ RAG service initialized successfully!' + colors.reset);
    } catch (error) {
      console.error(colors.red + '\n❌ Failed to initialize RAG service:' + colors.reset, error.message);
    }
  }
  
  console.log('\n' + colors.green + 'Setup complete!' + colors.reset);
  console.log('Next steps:');
  console.log(`1. Start the server: ${colors.cyan}cd server && npm start${colors.reset}`);
  console.log(`2. Test the RAG service: ${colors.cyan}node scripts/testRagService.js${colors.reset}`);
  console.log(`3. Monitor the service: ${colors.cyan}node scripts/monitorRagService.js${colors.reset}`);
  console.log(`\nFor more information, see ${colors.cyan}RAG-INTEGRATION.md${colors.reset}`);
  
  rl.close();
}

// Run the setup
setupRagEnv().catch(error => {
  console.error(colors.red + '\nSetup failed:' + colors.reset, error);
  process.exit(1);
});
