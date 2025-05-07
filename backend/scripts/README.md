# MongoDB Migration Scripts

This directory contains scripts to update the MongoDB schema and fix issues with database indexes.

## Problem: Duplicate Key Errors in Transaction Storage

The current setup was preventing duplicate transaction hashes from being saved to the database, even across different contracts. This means if the same contract was added multiple times by different users, or even the same user, the transactions were not duplicated as they should be.

## Solution

The following scripts will:
1. Remove unique constraint on transaction hashes
2. Fix indexes to allow duplicate transaction hashes
3. Ensure each contract addition is treated as completely independent

## How to Run

### 1. Migration Script (Recommended)

This script checks for problematic indexes and recreates the correct ones:

```bash
cd cryptique/backend
node scripts/migration.js
```

### 2. Index Dropping Script (Alternative)

If you just want to drop the problematic indexes:

```bash
cd cryptique/backend
node scripts/dropIndexes.js
```

## Schema Changes

The schema has been updated to remove any unique constraints on the `tx_hash` field, allowing the same transaction hash to be saved multiple times for different contract instances.

## After Running the Scripts

Once the scripts have been executed successfully, restart your server. New contract additions should now save all 100,000 transactions to the database, even if the same contract has been added before. 