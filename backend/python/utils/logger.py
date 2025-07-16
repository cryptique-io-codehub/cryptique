"""
Logging utility for Cryptique Python Data Processing Services
"""

import sys
import os
from pathlib import Path
from loguru import logger
from typing import Optional

def setup_logger(
    log_level: str = "INFO",
    log_file: Optional[str] = None,
    service_name: str = "cryptique-python-service"
) -> None:
    """
    Setup logger configuration for the service
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR)
        log_file: Path to log file (optional)
        service_name: Name of the service for log formatting
    """
    
    # Remove default handler
    logger.remove()
    
    # Create logs directory if it doesn't exist
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Console handler with colored output
    logger.add(
        sys.stdout,
        level=log_level,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
               "<level>{level: <8}</level> | "
               "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
               "<level>{message}</level>",
        colorize=True,
        enqueue=True
    )
    
    # File handler (if specified)
    if log_file:
        logger.add(
            log_file,
            level=log_level,
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} | {message}",
            rotation="10 MB",
            retention="30 days",
            compression="gz",
            enqueue=True
        )
    
    # Add service context
    logger.configure(extra={"service": service_name})
    
    logger.info(f"Logger initialized for {service_name} with level {log_level}")

def get_logger(name: str = None):
    """
    Get logger instance with optional name
    
    Args:
        name: Logger name (optional)
        
    Returns:
        Logger instance
    """
    if name:
        return logger.bind(name=name)
    return logger

# Performance logging decorator
def log_performance(func):
    """
    Decorator to log function execution time
    """
    import time
    from functools import wraps
    
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        execution_time = time.time() - start_time
        
        logger.info(
            f"Function {func.__name__} executed in {execution_time:.4f} seconds"
        )
        return result
    
    return wrapper

# Async performance logging decorator
def log_async_performance(func):
    """
    Decorator to log async function execution time
    """
    import asyncio
    import time
    from functools import wraps
    
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        result = await func(*args, **kwargs)
        execution_time = time.time() - start_time
        
        logger.info(
            f"Async function {func.__name__} executed in {execution_time:.4f} seconds"
        )
        return result
    
    return wrapper

# Context manager for logging operations
class LogContext:
    """Context manager for logging operations with timing"""
    
    def __init__(self, operation_name: str, log_level: str = "INFO"):
        self.operation_name = operation_name
        self.log_level = log_level
        self.start_time = None
        
    def __enter__(self):
        self.start_time = time.time()
        logger.log(self.log_level, f"Starting {self.operation_name}")
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        execution_time = time.time() - self.start_time
        
        if exc_type is None:
            logger.log(
                self.log_level,
                f"Completed {self.operation_name} in {execution_time:.4f} seconds"
            )
        else:
            logger.error(
                f"Failed {self.operation_name} after {execution_time:.4f} seconds: {exc_val}"
            )
        
        return False  # Don't suppress exceptions 