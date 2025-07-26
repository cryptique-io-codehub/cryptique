/**
 * Backend version of staking analysis function
 * Identifies if a transaction is related to staking/escrow operations
 */

function extractUnlockTimeFromInput(input, operationType) {
  try {
    if (!input || input.length < 74) return null;
    
    // Extract timestamp from different positions based on operation
    let timestampHex;
    let pattern = 'unknown';
    
    if (operationType === 'create_lock') {
      // create_lock(uint256 amount, uint256 unlock_time)
      // First param is amount, second is unlock time
      timestampHex = input.substring(74, 138);
      pattern = 'create_lock_second_param';
    } else if (operationType === 'increase_amount') {
      // increase_amount(uint256 amount)
      // Only one param, no unlock time
      return null;
    } else if (operationType === 'increase_unlock_time') {
      // increase_unlock_time(uint256 unlock_time)
      // First and only param is unlock time
      timestampHex = input.substring(10, 74);
      pattern = 'increase_unlock_time_first_param';
    } else {
      // Try common positions
      timestampHex = input.substring(10, 74);
      pattern = 'default_first_param';
    }
    
    if (!timestampHex || timestampHex === '0000000000000000000000000000000000000000000000000000000000000000') {
      return null;
    }
    
    const timestamp = parseInt(timestampHex, 16);
    if (isNaN(timestamp) || timestamp === 0) return null;
    
    // Validate timestamp (should be in the future, within reasonable range)
    const now = Math.floor(Date.now() / 1000);
    const minTime = now + (24 * 60 * 60); // At least 1 day in future
    const maxTime = now + (10 * 365 * 24 * 60 * 60); // Max 10 years in future
    
    if (timestamp < minTime || timestamp > maxTime) {
      return null;
    }
    
    const unlockDate = new Date(timestamp * 1000);
    const lockDuration = timestamp - now;
    const lockDurationDays = Math.floor(lockDuration / (24 * 60 * 60));
    const lockDurationHours = Math.floor(lockDuration / (60 * 60));
    
    return {
      unlockTime: unlockDate.toISOString(),
      unlockTimestamp: timestamp,
      lockDuration: lockDuration,
      lockDurationDays: lockDurationDays,
      lockDurationHours: lockDurationHours,
      pattern: pattern
    };
  } catch (error) {
    console.error('Error extracting unlock time:', error);
    return null;
  }
}

function identifyStakingTransaction(transaction, contractType = 'main') {
  const result = {
    isStaking: false,
    stakingType: null,
    confidence: 0,
    details: {}
  };

  // Only analyze for escrow contracts
  if (contractType !== 'escrow') {
    return result;
  }

  try {
    const input = transaction.input || '';
    const functionName = transaction.functionName || '';
    const methodId = transaction.methodId || '';
    
    // Enhanced staking method signatures and patterns
    const stakingPatterns = {
      // Create lock - First staking by wallet
      create_lock: {
        signatures: [
          '0x65fc3873', // create_lock(uint256,uint256)
          '0x4957677c', // createLock(uint256,uint256)
          '0x2c4e722e', // stake(uint256,uint256)
          '0x7acb7757', // deposit(uint256,uint256)
          '0xa694fc3a', // lock(uint256,uint256)
          '0xa9059cbb', // transfer-like patterns for staking
          '0x1249c58b', // mint-like patterns for staking
          '0x40c10f19', // mintTo patterns
          '0x6057361d', // lockTokens patterns
        ],
        keywords: [
          'create_lock', 'createlock', 'lock', 'stake', 'deposit', 'mint',
          'lockTokens', 'stakeTokens', 'depositTokens', 'lockup', 'commit',
          'escrow', 'vest', 'bond'
        ],
        type: 'create_lock'
      },
      // Increase amount - Increase staking amount
      increase_amount: {
        signatures: [
          '0x4957677c', // increase_amount(uint256)
          '0x2c4e722e', // increaseAmount(uint256)
          '0x4f6ccce7', // addStake(uint256)
          '0x7acb7757', // deposit(uint256) - additional deposit
          '0xa694fc3a', // addLock(uint256)
          '0x3ccfd60b', // topup(uint256)
          '0x8e19899e', // increaseStake(uint256)
          '0x1249c58b', // mint(uint256) - additional minting
          '0x40c10f19', // mintTo(address,uint256)
          '0x6057361d', // addTokens(uint256)
          '0x47e7ef24', // compound(uint256)
          '0x2e1a7d4d', // reinvest(uint256)
        ],
        keywords: [
          'increase_amount', 'increaseamount', 'increase', 'add_stake', 'addstake',
          'deposit', 'topup', 'compound', 'reinvest', 'addlock', 'addtokens',
          'increasestake', 'mint', 'mintto', 'extend_stake'
        ],
        type: 'increase_amount'
      },
      // Withdraw - Normal withdrawal when staking expires
      withdraw: {
        signatures: [
          '0x3ccfd60b', // withdraw()
          '0x2e1a7d4d', // withdraw(uint256)
          '0x8e19899e', // unstake()
          '0x69328dec', // unstake(uint256)
          '0x7c025200', // redeem()
          '0x1c1b8772', // redeem(uint256)
          '0x379607f5', // claim()
          '0x4e71d92d', // claim(uint256)
          '0x2f4f21e2', // exit()
          '0x853828b6', // release()
          '0x19165587', // release(uint256)
          '0x5312ea8e', // unlock()
          '0x2f6c493c', // unlock(uint256)
          '0xa2fb1175', // harvest()
          '0x4641257d', // harvest(uint256)
        ],
        keywords: [
          'withdraw', 'unstake', 'redeem', 'claim', 'exit', 'release', 'unlock',
          'harvest', 'collect', 'retrieve', 'getreward', 'cashout', 'liquidate',
          'mature', 'expire', 'complete'
        ],
        type: 'withdraw'
      },
      // Withdraw early - Early withdrawal before expiry
      withdraw_early: {
        signatures: [
          '0x69328dec', // withdraw_early()
          '0x7c025200', // withdrawEarly()
          '0x1c1b8772', // force_withdraw()
          '0x2f4f21e2', // forceWithdraw()
          '0x853828b6', // emergency_withdraw()
          '0x19165587', // emergencyWithdraw()
          '0x5312ea8e', // break_lock()
          '0x2f6c493c', // breakLock()
          '0xa2fb1175', // early_exit()
          '0x4641257d', // earlyExit()
          '0x379607f5', // penalty_withdraw()
          '0x4e71d92d', // penaltyWithdraw()
          '0x2e1a7d4d', // forfeit()
          '0x8e19899e', // abandon()
        ],
        keywords: [
          'withdraw_early', 'withdrawearly', 'early_withdraw', 'force_withdraw',
          'forcewithdraw', 'emergency_withdraw', 'emergencywithdraw', 'break_lock',
          'breaklock', 'early_exit', 'earlyexit', 'penalty_withdraw', 'penaltywithdraw',
          'forfeit', 'abandon', 'cancel', 'abort', 'terminate'
        ],
        type: 'withdraw_early'
      },
      // Increase unlock time - Extend stake expiry
      increase_unlock_time: {
        signatures: [
          '0x37f4c750', // increase_unlock_time(uint256)
          '0x2c4e722e', // increaseUnlockTime(uint256)
          '0x4f6ccce7', // extend_lock(uint256)
          '0x7acb7757', // extendLock(uint256)
          '0xa694fc3a', // extend(uint256)
          '0x3ccfd60b', // renew(uint256)
          '0x8e19899e', // prolongate(uint256)
          '0x1249c58b', // defer(uint256)
          '0x40c10f19', // postpone(uint256)
          '0x6057361d', // delay(uint256)
          '0x47e7ef24', // rollover(uint256)
          '0x2e1a7d4d', // continue(uint256)
          '0xeff7a612', // increase_unlock_time(uint256) - common signature
        ],
        keywords: [
          'increase_unlock_time', 'increaseunlocktime', 'extend_lock', 'extendlock',
          'extend', 'renew', 'prolongate', 'defer', 'postpone', 'delay', 'rollover',
          'continue', 'stretch', 'lengthen', 'expand_duration', 'add_time'
        ],
        type: 'increase_unlock_time'
      }
    };

    // Check method signatures first (most reliable)
    for (const [operation, pattern] of Object.entries(stakingPatterns)) {
      if (pattern.signatures.some(sig => input.toLowerCase().startsWith(sig.toLowerCase()))) {
        result.isStaking = true;
        result.stakingType = pattern.type;
        result.confidence = 0.95;
        result.details.method = 'signature';
        result.details.operation = operation;
        result.details.matchedSignature = pattern.signatures.find(sig => 
          input.toLowerCase().startsWith(sig.toLowerCase())
        );
        break;
      }
    }

    // Check function names if available (medium reliability)
    if (!result.isStaking && functionName) {
      const lowerFunctionName = functionName.toLowerCase();
      for (const [operation, pattern] of Object.entries(stakingPatterns)) {
        if (pattern.keywords.some(keyword => lowerFunctionName.includes(keyword.toLowerCase()))) {
          result.isStaking = true;
          result.stakingType = pattern.type;
          result.confidence = 0.8;
          result.details.method = 'functionName';
          result.details.operation = operation;
          result.details.matchedKeyword = pattern.keywords.find(keyword => 
            lowerFunctionName.includes(keyword.toLowerCase())
          );
          break;
        }
      }
    }

    // Check method ID if available (medium reliability)
    if (!result.isStaking && methodId) {
      for (const [operation, pattern] of Object.entries(stakingPatterns)) {
        if (pattern.signatures.some(sig => sig.toLowerCase() === methodId.toLowerCase())) {
          result.isStaking = true;
          result.stakingType = pattern.type;
          result.confidence = 0.85;
          result.details.method = 'methodId';
          result.details.operation = operation;
          result.details.matchedMethodId = methodId;
          break;
        }
      }
    }

    // Extract unlock time details for relevant operations
    if (result.isStaking && (
      result.stakingType === 'create_lock' || 
      result.stakingType === 'increase_amount' || 
      result.stakingType === 'increase_unlock_time'
    )) {
      const unlockTimeData = extractUnlockTimeFromInput(input, result.stakingType);
      if (unlockTimeData) {
        result.details.unlockTime = unlockTimeData.unlockTime;
        result.details.lockDuration = unlockTimeData.lockDuration;
        result.details.lockDurationDays = unlockTimeData.lockDurationDays;
        result.details.lockDurationHours = unlockTimeData.lockDurationHours;
        result.details.unlockTimestamp = unlockTimeData.unlockTimestamp;
        result.details.extractionPattern = unlockTimeData.pattern;
        result.confidence = Math.min(result.confidence + 0.1, 1.0); // Boost confidence
      }
    }

    // Additional heuristics for escrow contracts (low reliability)
    if (contractType === 'escrow' && !result.isStaking) {
      const value = parseFloat(transaction.value_eth || transaction.value || 0);
      const gasUsed = parseInt(transaction.gas_used || transaction.gas || 0);
      
      // Large value transactions in escrow contracts are likely stakes
      if (value > 0) {
        result.isStaking = true;
        result.stakingType = 'create_lock';
        result.confidence = 0.4;
        result.details.method = 'heuristic';
        result.details.reason = 'value_transfer_to_escrow';
        result.details.value = value;
      }
      
      // High gas usage might indicate complex staking operations
      if (gasUsed > 100000) {
        result.confidence = Math.min(result.confidence + 0.1, 1.0);
        result.details.highGasUsage = true;
      }
    }

    // Add chain-specific analysis
    const chainName = transaction.chain || 'Unknown';
    result.details.chain = chainName;
    result.details.analysisTimestamp = new Date().toISOString();

    return result;
  } catch (error) {
    console.error('Error identifying staking transaction:', error);
    return result;
  }
}

module.exports = { identifyStakingTransaction, extractUnlockTimeFromInput }; 