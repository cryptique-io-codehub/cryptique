#!/bin/bash

# Cryptique RAG System Backup Script
# This script creates backups of MongoDB and vector store data with rotation

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/cryptique}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${BACKUP_ROOT}/logs/backup_${TIMESTAMP}.log"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
COMPRESSION_LEVEL="${COMPRESSION_LEVEL:-6}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        INFO)  echo -e "${GREEN}[INFO]${NC} $message" | tee -a "$LOG_FILE" ;;
        WARN)  echo -e "${YELLOW}[WARN]${NC} $message" | tee -a "$LOG_FILE" ;;
        ERROR) echo -e "${RED}[ERROR]${NC} $message" | tee -a "$LOG_FILE" ;;
        DEBUG) echo -e "${BLUE}[DEBUG]${NC} $message" | tee -a "$LOG_FILE" ;;
    esac
}

# Error handler
error_exit() {
    log ERROR "Backup failed: $1"
    cleanup_temp_files
    exit 1
}

# Cleanup function
cleanup_temp_files() {
    if [[ -n "${TEMP_DIR:-}" && -d "$TEMP_DIR" ]]; then
        log INFO "Cleaning up temporary files..."
        rm -rf "$TEMP_DIR"
    fi
}

# Trap errors and cleanup
trap 'error_exit "Script interrupted"' INT TERM
trap 'cleanup_temp_files' EXIT

# Check dependencies
check_dependencies() {
    local deps=("mongodump" "tar" "gzip" "aws" "node")
    local missing=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing+=("$dep")
        fi
    done
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        error_exit "Missing dependencies: ${missing[*]}"
    fi
}

# Load environment variables
load_environment() {
    if [[ -f "$PROJECT_ROOT/.env" ]]; then
        # shellcheck source=/dev/null
        source "$PROJECT_ROOT/.env"
        log INFO "Environment loaded from .env file"
    else
        log WARN ".env file not found, using environment variables"
    fi
    
    # Validate required environment variables
    local required_vars=("MONGODB_URI")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        error_exit "Missing required environment variables: ${missing_vars[*]}"
    fi
}

# Create backup directories
setup_directories() {
    local dirs=(
        "$BACKUP_ROOT"
        "$BACKUP_ROOT/mongodb"
        "$BACKUP_ROOT/vectors"
        "$BACKUP_ROOT/logs"
        "$BACKUP_ROOT/archives"
    )
    
    for dir in "${dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            log INFO "Created directory: $dir"
        fi
    done
}

# Backup MongoDB
backup_mongodb() {
    log INFO "Starting MongoDB backup..."
    
    local mongo_backup_dir="$BACKUP_ROOT/mongodb/mongo_$TIMESTAMP"
    local mongo_archive="$BACKUP_ROOT/archives/mongodb_$TIMESTAMP.tar.gz"
    
    # Create MongoDB dump
    mongodump --uri "$MONGODB_URI" --out "$mongo_backup_dir" --gzip
    
    if [[ $? -eq 0 ]]; then
        log INFO "MongoDB dump completed successfully"
        
        # Create compressed archive
        tar -czf "$mongo_archive" -C "$BACKUP_ROOT/mongodb" "mongo_$TIMESTAMP"
        
        if [[ $? -eq 0 ]]; then
            log INFO "MongoDB archive created: $mongo_archive"
            
            # Verify archive
            if tar -tzf "$mongo_archive" > /dev/null 2>&1; then
                log INFO "MongoDB archive verified successfully"
                
                # Calculate and log archive size
                local archive_size=$(du -h "$mongo_archive" | cut -f1)
                log INFO "MongoDB archive size: $archive_size"
                
                # Remove uncompressed backup
                rm -rf "$mongo_backup_dir"
                
                return 0
            else
                error_exit "MongoDB archive verification failed"
            fi
        else
            error_exit "Failed to create MongoDB archive"
        fi
    else
        error_exit "MongoDB dump failed"
    fi
}

# Backup Vector Store
backup_vector_store() {
    log INFO "Starting vector store backup..."
    
    local vector_backup_dir="$BACKUP_ROOT/vectors/vectors_$TIMESTAMP"
    local vector_archive="$BACKUP_ROOT/archives/vectors_$TIMESTAMP.tar.gz"
    
    # Create vector store backup using Node.js script
    node "$SCRIPT_DIR/backup-vectors.js" "$vector_backup_dir"
    
    if [[ $? -eq 0 ]]; then
        log INFO "Vector store backup completed successfully"
        
        # Create compressed archive
        tar -czf "$vector_archive" -C "$BACKUP_ROOT/vectors" "vectors_$TIMESTAMP"
        
        if [[ $? -eq 0 ]]; then
            log INFO "Vector store archive created: $vector_archive"
            
            # Verify archive
            if tar -tzf "$vector_archive" > /dev/null 2>&1; then
                log INFO "Vector store archive verified successfully"
                
                # Calculate and log archive size
                local archive_size=$(du -h "$vector_archive" | cut -f1)
                log INFO "Vector store archive size: $archive_size"
                
                # Remove uncompressed backup
                rm -rf "$vector_backup_dir"
                
                return 0
            else
                error_exit "Vector store archive verification failed"
            fi
        else
            error_exit "Failed to create vector store archive"
        fi
    else
        error_exit "Vector store backup failed"
    fi
}

# Backup application files
backup_application() {
    log INFO "Starting application backup..."
    
    local app_archive="$BACKUP_ROOT/archives/application_$TIMESTAMP.tar.gz"
    
    # Create application archive (excluding node_modules, logs, and temporary files)
    tar -czf "$app_archive" \
        --exclude="node_modules" \
        --exclude="logs" \
        --exclude="*.log" \
        --exclude=".git" \
        --exclude="tmp" \
        --exclude="temp" \
        -C "$(dirname "$PROJECT_ROOT")" \
        "$(basename "$PROJECT_ROOT")"
    
    if [[ $? -eq 0 ]]; then
        log INFO "Application archive created: $app_archive"
        
        # Calculate and log archive size
        local archive_size=$(du -h "$app_archive" | cut -f1)
        log INFO "Application archive size: $archive_size"
        
        return 0
    else
        error_exit "Failed to create application archive"
    fi
}

# Upload to cloud storage (optional)
upload_to_cloud() {
    if [[ -n "${AWS_S3_BUCKET:-}" && -n "${AWS_ACCESS_KEY_ID:-}" ]]; then
        log INFO "Uploading backups to AWS S3..."
        
        local s3_prefix="cryptique-backups/$(date +%Y/%m/%d)"
        
        # Upload archives
        for archive in "$BACKUP_ROOT/archives"/*_"$TIMESTAMP".tar.gz; do
            if [[ -f "$archive" ]]; then
                local filename=$(basename "$archive")
                aws s3 cp "$archive" "s3://$AWS_S3_BUCKET/$s3_prefix/$filename"
                
                if [[ $? -eq 0 ]]; then
                    log INFO "Uploaded to S3: $filename"
                else
                    log WARN "Failed to upload to S3: $filename"
                fi
            fi
        done
    fi
}

# Rotate old backups
rotate_backups() {
    log INFO "Rotating old backups (keeping last $RETENTION_DAYS days)..."
    
    # Remove old MongoDB backups
    find "$BACKUP_ROOT/mongodb" -type d -name "mongo_*" -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true
    
    # Remove old vector backups
    find "$BACKUP_ROOT/vectors" -type d -name "vectors_*" -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true
    
    # Remove old archives
    find "$BACKUP_ROOT/archives" -type f -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # Remove old logs
    find "$BACKUP_ROOT/logs" -type f -name "backup_*.log" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    log INFO "Backup rotation completed"
}

# Generate backup report
generate_report() {
    local report_file="$BACKUP_ROOT/logs/backup_report_$TIMESTAMP.json"
    local end_time=$(date '+%Y-%m-%d %H:%M:%S')
    local duration=$(($(date +%s) - START_TIME))
    
    cat > "$report_file" << EOF
{
  "backup_id": "$TIMESTAMP",
  "start_time": "$START_TIME_STR",
  "end_time": "$end_time",
  "duration_seconds": $duration,
  "status": "success",
  "components": {
    "mongodb": {
      "status": "completed",
      "archive": "mongodb_$TIMESTAMP.tar.gz"
    },
    "vector_store": {
      "status": "completed",
      "archive": "vectors_$TIMESTAMP.tar.gz"
    },
    "application": {
      "status": "completed",
      "archive": "application_$TIMESTAMP.tar.gz"
    }
  },
  "backup_location": "$BACKUP_ROOT/archives",
  "retention_days": $RETENTION_DAYS
}
EOF
    
    log INFO "Backup report generated: $report_file"
}

# Main backup function
main() {
    local START_TIME=$(date +%s)
    local START_TIME_STR=$(date '+%Y-%m-%d %H:%M:%S')
    
    log INFO "=== Cryptique RAG System Backup Started ==="
    log INFO "Backup ID: $TIMESTAMP"
    log INFO "Start time: $START_TIME_STR"
    
    # Setup
    check_dependencies
    load_environment
    setup_directories
    
    # Perform backups
    backup_mongodb
    backup_vector_store
    backup_application
    
    # Upload to cloud (if configured)
    upload_to_cloud
    
    # Cleanup
    rotate_backups
    generate_report
    
    local end_time=$(date '+%Y-%m-%d %H:%M:%S')
    local duration=$(($(date +%s) - START_TIME))
    
    log INFO "=== Backup Completed Successfully ==="
    log INFO "End time: $end_time"
    log INFO "Duration: ${duration}s"
    log INFO "Backup location: $BACKUP_ROOT/archives"
}

# Run main function
main "$@" 