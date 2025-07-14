#!/usr/bin/env node

/**
 * Analytics Data Migration Runner
 * 
 * This script runs the analytics data migration with progress reporting
 * and error handling. It provides a CLI interface with options for
 * controlling the migration process.
 */

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const mongoose = require('mongoose');
const { migrateAnalyticsData } = require('./analytics-data-migration');

// Configure CLI
program
  .name('run-analytics-migration')
  .description('Run the analytics data migration for RAG implementation')
  .option('-v, --verbose', 'Enable verbose output')
  .option('-d, --dry-run', 'Perform a dry run without saving data')
  .option('-f, --force', 'Force migration even if already completed')
  .option('-t, --team <teamId>', 'Migrate data for specific team ID')
  .option('-s, --site <siteId>', 'Migrate data for specific site ID')
  .option('-l, --limit <number>', 'Limit number of records to process', parseInt)
  .option('--from <date>', 'Process records from this date (YYYY-MM-DD)')
  .option('--to <date>', 'Process records until this date (YYYY-MM-DD)')
  .option('--phase <phase>', 'Start from specific phase (extraction, transformation, validation, embedding-job-creation)')
  .option('--skip-cleanup', 'Skip cleanup of temporary files')
  .option('--test', 'Run in test mode with minimal data')
  .parse(process.argv);

const options = program.opts();

// Set up environment
const dotEnvPath = path.join(__dirname, '../../.env');
if (fs.existsSync(dotEnvPath)) {
  require('dotenv').config({ path: dotEnvPath });
}

// Progress tracking
let progressInterval;
let spinner;

/**
 * Main function to run migration
 */
async function runMigration() {
  console.log(chalk.bold.blue('🚀 Starting Analytics Data Migration'));
  console.log(chalk.gray('Time:'), chalk.yellow(new Date().toISOString()));
  
  if (options.verbose) {
    console.log(chalk.gray('Options:'), options);
  }
  
  try {
    // Connect to MongoDB
    await connectToDatabase();
    
    // Start progress spinner
    spinner = ora('Preparing migration...').start();
    
    // Set up progress tracking
    const progressFile = path.join(__dirname, 'migration-progress.json');
    progressInterval = setInterval(() => {
      try {
        if (fs.existsSync(progressFile)) {
          const progress = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
          updateProgressDisplay(progress);
        }
      } catch (err) {
        // Ignore progress reading errors
      }
    }, 1000);
    
    // Run migration
    const migrationOptions = {
      dryRun: options.dryRun,
      teamId: options.team,
      siteId: options.site,
      limit: options.limit,
      fromDate: options.from ? new Date(options.from) : undefined,
      toDate: options.to ? new Date(options.to) : undefined,
      startPhase: options.phase,
      skipCleanup: options.skipCleanup,
      testMode: options.test,
      force: options.force
    };
    
    const result = await migrateAnalyticsData(migrationOptions);
    
    // Stop progress tracking
    clearInterval(progressInterval);
    
    // Display results
    if (result.success) {
      spinner.succeed(chalk.green('Migration completed successfully'));
      displayResults(result);
    } else {
      spinner.fail(chalk.red(`Migration failed during ${result.phase} phase`));
      console.error(chalk.red('Error:'), result.error);
    }
    
  } catch (error) {
    clearInterval(progressInterval);
    if (spinner) spinner.fail(chalk.red('Migration failed with an error'));
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log(chalk.gray('Database connection closed'));
  }
}

/**
 * Connect to MongoDB database
 */
async function connectToDatabase() {
  const dbUri = options.test ? 
    (process.env.TEST_MONGODB_URI || process.env.MONGODB_URI) : 
    process.env.MONGODB_URI;
  
  if (!dbUri) {
    throw new Error('MongoDB URI not found. Please set MONGODB_URI in environment variables');
  }
  
  console.log(chalk.gray('Connecting to database...'));
  
  try {
    await mongoose.connect(dbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log(chalk.green('✓ Connected to MongoDB'));
  } catch (error) {
    console.error(chalk.red('✗ Failed to connect to MongoDB:'), error.message);
    throw error;
  }
}

/**
 * Update progress display
 */
function updateProgressDisplay(progress) {
  if (!spinner) return;
  
  const percent = progress.totalRecords > 0 ? 
    Math.round((progress.processedRecords / progress.totalRecords) * 100) : 0;
  
  let text = `${chalk.bold(progress.currentPhase)} phase: `;
  text += chalk.cyan(`${progress.processedRecords}/${progress.totalRecords} records`);
  text += chalk.gray(` (${percent}%)`);
  
  if (progress.estimatedCompletion) {
    const estimatedTime = new Date(progress.estimatedCompletion);
    const timeRemaining = getTimeRemaining(estimatedTime);
    text += chalk.gray(` - ETA: ${timeRemaining}`);
  }
  
  spinner.text = text;
}

/**
 * Get human-readable time remaining
 */
function getTimeRemaining(endTime) {
  const totalSeconds = Math.max(0, Math.floor((endTime - new Date()) / 1000));
  
  if (totalSeconds === 0) return 'Complete';
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  let result = '';
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0 || hours > 0) result += `${minutes}m `;
  result += `${seconds}s`;
  
  return result;
}

/**
 * Display migration results
 */
function displayResults(result) {
  console.log('\n' + chalk.bold.green('📊 Migration Summary'));
  console.log(chalk.bold('Records Processed:'), chalk.cyan(result.processedRecords));
  console.log(chalk.bold('Failed Records:'), result.failedRecords > 0 ? 
    chalk.red(result.failedRecords) : chalk.green(result.failedRecords));
  
  if (result.errors && result.errors.length > 0) {
    console.log('\n' + chalk.bold.yellow('⚠️ Errors'));
    result.errors.slice(0, 5).forEach((error, i) => {
      console.log(chalk.yellow(`${i + 1}.`), chalk.gray(`[${error.phase}]`), error.message);
    });
    
    if (result.errors.length > 5) {
      console.log(chalk.yellow(`...and ${result.errors.length - 5} more errors`));
    }
  }
  
  console.log('\n' + chalk.bold.blue('📝 Next Steps'));
  console.log('1. Check the embedding jobs in the admin dashboard');
  console.log('2. Monitor job progress and vector document creation');
  console.log('3. Verify data integrity with the test tools');
  
  if (options.dryRun) {
    console.log('\n' + chalk.bold.yellow('⚠️ This was a dry run. No data was saved.'));
    console.log('Run without --dry-run to perform the actual migration.');
  }
}

// Run the migration
runMigration().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 