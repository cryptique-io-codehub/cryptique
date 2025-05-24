/**
 * Circuit Breaker Pattern Implementation
 * 
 * This module implements the circuit breaker pattern to prevent
 * cascading failures when dependent services are unavailable.
 */

// Circuit states
const STATES = {
  CLOSED: 'closed',       // Normal operation, requests flow through
  OPEN: 'open',           // Circuit is open, requests fail fast
  HALF_OPEN: 'half-open'  // Testing if service is back online
};

class CircuitBreaker {
  /**
   * Create a new circuit breaker
   * @param {Object} options - Circuit breaker options
   */
  constructor(options = {}) {
    const {
      failureThreshold = 5,     // Number of failures before opening
      resetTimeout = 30000,     // Time in ms before attempting reset (30s)
      monitorInterval = 5000,   // Interval for checking health (5s)
      timeout = 10000,          // Default request timeout (10s)
      name = 'default',         // Name for this circuit (for logging)
      fallbackFn = null,        // Optional fallback function
      onStateChange = null      // State change callback
    } = options;
    
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.monitorInterval = monitorInterval;
    this.timeout = timeout;
    this.name = name;
    this.fallbackFn = fallbackFn;
    this.onStateChange = onStateChange;
    
    // Initialize internal state
    this.state = STATES.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.lastStateChangeTime = Date.now();
    this.monitorIntervalId = null;
    
    // Start health monitoring
    this.startMonitoring();
  }
  
  /**
   * Execute a function with circuit breaker protection
   * @param {Function} fn - Function to execute
   * @param {...any} args - Arguments to pass to the function
   * @returns {Promise<any>} - Result of the function
   */
  async execute(fn, ...args) {
    // Check if circuit is open
    if (this.state === STATES.OPEN) {
      // If in open state, fail fast
      console.log(`Circuit ${this.name} is OPEN, failing fast`);
      
      // Call fallback if provided
      if (this.fallbackFn) {
        return this.fallbackFn(...args);
      }
      
      throw new Error(`Service unavailable (circuit ${this.name} open)`);
    }
    
    // If half-open, only allow one test request
    if (this.state === STATES.HALF_OPEN) {
      console.log(`Circuit ${this.name} is HALF-OPEN, testing service`);
    }
    
    // Execute function with timeout
    try {
      // Create promise with timeout
      const timeoutPromise = new Promise((_, reject) => {
        const id = setTimeout(() => {
          clearTimeout(id);
          reject(new Error(`Request timeout after ${this.timeout}ms`));
        }, this.timeout);
      });
      
      // Race the function against timeout
      const result = await Promise.race([
        fn(...args),
        timeoutPromise
      ]);
      
      // Success - reset failure count and close circuit if half-open
      this.recordSuccess();
      return result;
    } catch (error) {
      // Record failure and possibly open circuit
      this.recordFailure(error);
      
      // Call fallback if provided
      if (this.fallbackFn) {
        return this.fallbackFn(...args);
      }
      
      // Re-throw error
      throw error;
    }
  }
  
  /**
   * Record a successful operation
   */
  recordSuccess() {
    // If half-open and success, close the circuit
    if (this.state === STATES.HALF_OPEN) {
      this.setState(STATES.CLOSED);
    }
    
    // Reset failure count
    this.failureCount = 0;
  }
  
  /**
   * Record a failure operation
   * @param {Error} error - Error that occurred
   */
  recordFailure(error) {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    console.warn(`Circuit ${this.name} failure ${this.failureCount}/${this.failureThreshold}: ${error.message}`);
    
    // If failure threshold reached, open circuit
    if (this.state === STATES.CLOSED && this.failureCount >= this.failureThreshold) {
      this.setState(STATES.OPEN);
    } else if (this.state === STATES.HALF_OPEN) {
      // If failed during half-open test, reopen circuit
      this.setState(STATES.OPEN);
    }
  }
  
  /**
   * Change circuit state
   * @param {string} newState - New state
   */
  setState(newState) {
    if (this.state === newState) return;
    
    const oldState = this.state;
    this.state = newState;
    this.lastStateChangeTime = Date.now();
    
    console.log(`Circuit ${this.name} state changed from ${oldState} to ${newState}`);
    
    // Call state change callback if provided
    if (this.onStateChange) {
      this.onStateChange({
        name: this.name,
        oldState,
        newState,
        failureCount: this.failureCount,
        lastFailureTime: this.lastFailureTime
      });
    }
  }
  
  /**
   * Start health monitoring
   */
  startMonitoring() {
    if (this.monitorIntervalId) return;
    
    this.monitorIntervalId = setInterval(() => {
      // If circuit is open and reset timeout has passed, transition to half-open
      if (
        this.state === STATES.OPEN &&
        this.lastStateChangeTime &&
        Date.now() - this.lastStateChangeTime >= this.resetTimeout
      ) {
        console.log(`Circuit ${this.name} reset timeout reached, transitioning to HALF-OPEN`);
        this.setState(STATES.HALF_OPEN);
      }
    }, this.monitorInterval);
  }
  
  /**
   * Stop health monitoring
   */
  stopMonitoring() {
    if (this.monitorIntervalId) {
      clearInterval(this.monitorIntervalId);
      this.monitorIntervalId = null;
    }
  }
  
  /**
   * Get circuit status
   * @returns {Object} - Current circuit status
   */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      lastStateChangeTime: this.lastStateChangeTime,
      uptime: Date.now() - this.lastStateChangeTime
    };
  }
  
  /**
   * Force circuit to a specific state
   * @param {string} state - Target state
   */
  forceState(state) {
    if (Object.values(STATES).includes(state)) {
      this.setState(state);
    } else {
      throw new Error(`Invalid circuit state: ${state}`);
    }
  }
  
  /**
   * Reset circuit to closed state
   */
  reset() {
    this.failureCount = 0;
    this.setState(STATES.CLOSED);
  }
}

/**
 * Factory function to create circuit breakers
 * @param {Object} options - Circuit breaker options
 * @returns {CircuitBreaker} - New circuit breaker
 */
function createCircuitBreaker(options = {}) {
  return new CircuitBreaker(options);
}

module.exports = {
  STATES,
  CircuitBreaker,
  createCircuitBreaker
}; 