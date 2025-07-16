"""
Metrics collection utilities for performance monitoring
"""

import time
import psutil
import threading
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from collections import defaultdict, deque
import json

from .logger import get_logger

logger = get_logger(__name__)

@dataclass
class MetricPoint:
    """Single metric data point"""
    timestamp: datetime
    value: float
    tags: Dict[str, str] = field(default_factory=dict)
    
@dataclass
class PerformanceMetrics:
    """Performance metrics snapshot"""
    timestamp: datetime
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    disk_io_read_mb: float
    disk_io_write_mb: float
    network_sent_mb: float
    network_recv_mb: float
    active_threads: int
    open_files: int

class MetricsCollector:
    """
    Comprehensive metrics collector for system and application performance
    """
    
    def __init__(self, collection_interval: int = 60, max_history: int = 1000):
        self.collection_interval = collection_interval
        self.max_history = max_history
        self.metrics = defaultdict(lambda: deque(maxlen=max_history))
        self.performance_history = deque(maxlen=max_history)
        self.custom_metrics = defaultdict(lambda: deque(maxlen=max_history))
        
        # Counters
        self.counters = defaultdict(int)
        self.timers = defaultdict(list)
        self.gauges = defaultdict(float)
        
        # Collection state
        self.is_collecting = False
        self.collection_thread = None
        self.start_time = datetime.now()
        
        # Performance baseline
        self.baseline_metrics = None
        
    def start_collection(self):
        """Start metrics collection in background thread"""
        if self.is_collecting:
            logger.warning("Metrics collection already running")
            return
        
        self.is_collecting = True
        self.collection_thread = threading.Thread(target=self._collection_loop, daemon=True)
        self.collection_thread.start()
        logger.info("Metrics collection started")
    
    def stop_collection(self):
        """Stop metrics collection"""
        self.is_collecting = False
        if self.collection_thread:
            self.collection_thread.join(timeout=5)
        logger.info("Metrics collection stopped")
    
    def _collection_loop(self):
        """Main collection loop"""
        while self.is_collecting:
            try:
                # Collect system metrics
                self._collect_system_metrics()
                
                # Collect application metrics
                self._collect_application_metrics()
                
                # Sleep until next collection
                time.sleep(self.collection_interval)
                
            except Exception as e:
                logger.error(f"Error in metrics collection: {e}")
                time.sleep(5)  # Short sleep on error
    
    def _collect_system_metrics(self):
        """Collect system performance metrics"""
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            self._record_metric('system.cpu.percent', cpu_percent)
            
            # Memory metrics
            memory = psutil.virtual_memory()
            self._record_metric('system.memory.percent', memory.percent)
            self._record_metric('system.memory.used_mb', memory.used / 1024 / 1024)
            self._record_metric('system.memory.available_mb', memory.available / 1024 / 1024)
            
            # Disk I/O metrics
            disk_io = psutil.disk_io_counters()
            if disk_io:
                self._record_metric('system.disk.read_mb', disk_io.read_bytes / 1024 / 1024)
                self._record_metric('system.disk.write_mb', disk_io.write_bytes / 1024 / 1024)
            
            # Network metrics
            network_io = psutil.net_io_counters()
            if network_io:
                self._record_metric('system.network.sent_mb', network_io.bytes_sent / 1024 / 1024)
                self._record_metric('system.network.recv_mb', network_io.bytes_recv / 1024 / 1024)
            
            # Process metrics
            process = psutil.Process()
            self._record_metric('process.cpu.percent', process.cpu_percent())
            self._record_metric('process.memory.percent', process.memory_percent())
            self._record_metric('process.memory.rss_mb', process.memory_info().rss / 1024 / 1024)
            self._record_metric('process.threads', process.num_threads())
            self._record_metric('process.open_files', len(process.open_files()))
            
            # Create performance snapshot
            performance_snapshot = PerformanceMetrics(
                timestamp=datetime.now(),
                cpu_percent=cpu_percent,
                memory_percent=memory.percent,
                memory_used_mb=memory.used / 1024 / 1024,
                disk_io_read_mb=disk_io.read_bytes / 1024 / 1024 if disk_io else 0,
                disk_io_write_mb=disk_io.write_bytes / 1024 / 1024 if disk_io else 0,
                network_sent_mb=network_io.bytes_sent / 1024 / 1024 if network_io else 0,
                network_recv_mb=network_io.bytes_recv / 1024 / 1024 if network_io else 0,
                active_threads=process.num_threads(),
                open_files=len(process.open_files())
            )
            
            self.performance_history.append(performance_snapshot)
            
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
    
    def _collect_application_metrics(self):
        """Collect application-specific metrics"""
        try:
            # Service uptime
            uptime_seconds = (datetime.now() - self.start_time).total_seconds()
            self._record_metric('app.uptime_seconds', uptime_seconds)
            
            # Counter metrics
            for name, value in self.counters.items():
                self._record_metric(f'app.counter.{name}', value)
            
            # Gauge metrics
            for name, value in self.gauges.items():
                self._record_metric(f'app.gauge.{name}', value)
            
            # Timer metrics (calculate statistics)
            for name, times in self.timers.items():
                if times:
                    avg_time = sum(times) / len(times)
                    min_time = min(times)
                    max_time = max(times)
                    self._record_metric(f'app.timer.{name}.avg', avg_time)
                    self._record_metric(f'app.timer.{name}.min', min_time)
                    self._record_metric(f'app.timer.{name}.max', max_time)
                    self._record_metric(f'app.timer.{name}.count', len(times))
            
        except Exception as e:
            logger.error(f"Error collecting application metrics: {e}")
    
    def _record_metric(self, name: str, value: float, tags: Optional[Dict[str, str]] = None):
        """Record a metric point"""
        point = MetricPoint(
            timestamp=datetime.now(),
            value=value,
            tags=tags or {}
        )
        self.metrics[name].append(point)
    
    def increment_counter(self, name: str, value: int = 1, tags: Optional[Dict[str, str]] = None):
        """Increment a counter metric"""
        self.counters[name] += value
        self._record_metric(f'counter.{name}', self.counters[name], tags)
    
    def set_gauge(self, name: str, value: float, tags: Optional[Dict[str, str]] = None):
        """Set a gauge metric"""
        self.gauges[name] = value
        self._record_metric(f'gauge.{name}', value, tags)
    
    def record_timer(self, name: str, duration: float, tags: Optional[Dict[str, str]] = None):
        """Record a timer metric"""
        self.timers[name].append(duration)
        self._record_metric(f'timer.{name}', duration, tags)
        
        # Keep only recent timer values
        if len(self.timers[name]) > 100:
            self.timers[name] = self.timers[name][-100:]
    
    def record_custom_metric(self, name: str, value: float, tags: Optional[Dict[str, str]] = None):
        """Record a custom metric"""
        point = MetricPoint(
            timestamp=datetime.now(),
            value=value,
            tags=tags or {}
        )
        self.custom_metrics[name].append(point)
    
    def get_metric_history(self, name: str, duration_minutes: int = 60) -> List[MetricPoint]:
        """Get metric history for a specific duration"""
        cutoff_time = datetime.now() - timedelta(minutes=duration_minutes)
        
        if name in self.metrics:
            return [point for point in self.metrics[name] if point.timestamp >= cutoff_time]
        return []
    
    def get_performance_summary(self, duration_minutes: int = 60) -> Dict[str, Any]:
        """Get performance summary for a specific duration"""
        cutoff_time = datetime.now() - timedelta(minutes=duration_minutes)
        
        # Filter recent performance data
        recent_performance = [
            perf for perf in self.performance_history 
            if perf.timestamp >= cutoff_time
        ]
        
        if not recent_performance:
            return {}
        
        # Calculate statistics
        cpu_values = [p.cpu_percent for p in recent_performance]
        memory_values = [p.memory_percent for p in recent_performance]
        
        return {
            'duration_minutes': duration_minutes,
            'sample_count': len(recent_performance),
            'cpu': {
                'avg': sum(cpu_values) / len(cpu_values),
                'min': min(cpu_values),
                'max': max(cpu_values),
                'current': cpu_values[-1] if cpu_values else 0
            },
            'memory': {
                'avg': sum(memory_values) / len(memory_values),
                'min': min(memory_values),
                'max': max(memory_values),
                'current': memory_values[-1] if memory_values else 0
            },
            'latest_snapshot': recent_performance[-1].__dict__ if recent_performance else {}
        }
    
    def get_application_metrics(self) -> Dict[str, Any]:
        """Get current application metrics"""
        return {
            'counters': dict(self.counters),
            'gauges': dict(self.gauges),
            'timers': {
                name: {
                    'count': len(times),
                    'avg': sum(times) / len(times) if times else 0,
                    'min': min(times) if times else 0,
                    'max': max(times) if times else 0
                }
                for name, times in self.timers.items()
            },
            'uptime_seconds': (datetime.now() - self.start_time).total_seconds()
        }
    
    def get_all_metrics(self) -> Dict[str, Any]:
        """Get all collected metrics"""
        return {
            'system_metrics': {
                name: [
                    {
                        'timestamp': point.timestamp.isoformat(),
                        'value': point.value,
                        'tags': point.tags
                    }
                    for point in points
                ]
                for name, points in self.metrics.items()
            },
            'performance_history': [
                {
                    'timestamp': perf.timestamp.isoformat(),
                    'cpu_percent': perf.cpu_percent,
                    'memory_percent': perf.memory_percent,
                    'memory_used_mb': perf.memory_used_mb,
                    'active_threads': perf.active_threads,
                    'open_files': perf.open_files
                }
                for perf in self.performance_history
            ],
            'application_metrics': self.get_application_metrics(),
            'custom_metrics': {
                name: [
                    {
                        'timestamp': point.timestamp.isoformat(),
                        'value': point.value,
                        'tags': point.tags
                    }
                    for point in points
                ]
                for name, points in self.custom_metrics.items()
            }
        }
    
    def detect_anomalies(self, metric_name: str, threshold_std: float = 2.0) -> List[Dict[str, Any]]:
        """Detect anomalies in a metric using statistical analysis"""
        if metric_name not in self.metrics:
            return []
        
        points = list(self.metrics[metric_name])
        if len(points) < 10:  # Need minimum data points
            return []
        
        # Calculate statistics
        values = [p.value for p in points]
        mean_val = sum(values) / len(values)
        std_val = (sum((x - mean_val) ** 2 for x in values) / len(values)) ** 0.5
        
        if std_val == 0:
            return []
        
        # Find anomalies
        anomalies = []
        for point in points:
            z_score = abs(point.value - mean_val) / std_val
            if z_score > threshold_std:
                anomalies.append({
                    'timestamp': point.timestamp.isoformat(),
                    'value': point.value,
                    'z_score': z_score,
                    'threshold': threshold_std,
                    'severity': 'high' if z_score > 3.0 else 'medium'
                })
        
        return anomalies
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get overall system health status"""
        try:
            # Get latest performance data
            latest_perf = self.performance_history[-1] if self.performance_history else None
            
            if not latest_perf:
                return {
                    'status': 'unknown',
                    'message': 'No performance data available'
                }
            
            # Health thresholds
            cpu_threshold = 80.0
            memory_threshold = 85.0
            
            # Determine health status
            issues = []
            
            if latest_perf.cpu_percent > cpu_threshold:
                issues.append(f'High CPU usage: {latest_perf.cpu_percent:.1f}%')
            
            if latest_perf.memory_percent > memory_threshold:
                issues.append(f'High memory usage: {latest_perf.memory_percent:.1f}%')
            
            if latest_perf.active_threads > 100:
                issues.append(f'High thread count: {latest_perf.active_threads}')
            
            if latest_perf.open_files > 1000:
                issues.append(f'High open file count: {latest_perf.open_files}')
            
            # Determine overall status
            if not issues:
                status = 'healthy'
                message = 'All systems operating normally'
            elif len(issues) == 1:
                status = 'warning'
                message = f'Warning: {issues[0]}'
            else:
                status = 'critical'
                message = f'Multiple issues detected: {", ".join(issues)}'
            
            return {
                'status': status,
                'message': message,
                'issues': issues,
                'metrics': {
                    'cpu_percent': latest_perf.cpu_percent,
                    'memory_percent': latest_perf.memory_percent,
                    'active_threads': latest_perf.active_threads,
                    'open_files': latest_perf.open_files
                },
                'timestamp': latest_perf.timestamp.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting health status: {e}")
            return {
                'status': 'error',
                'message': f'Error determining health status: {str(e)}'
            }
    
    def export_metrics(self, filename: str):
        """Export metrics to JSON file"""
        try:
            metrics_data = self.get_all_metrics()
            with open(filename, 'w') as f:
                json.dump(metrics_data, f, indent=2)
            logger.info(f"Metrics exported to {filename}")
        except Exception as e:
            logger.error(f"Error exporting metrics: {e}")
    
    def reset_metrics(self):
        """Reset all metrics"""
        self.metrics.clear()
        self.performance_history.clear()
        self.custom_metrics.clear()
        self.counters.clear()
        self.timers.clear()
        self.gauges.clear()
        logger.info("All metrics reset")

# Context manager for timing operations
class Timer:
    """Context manager for timing operations"""
    
    def __init__(self, metrics_collector: MetricsCollector, name: str, tags: Optional[Dict[str, str]] = None):
        self.metrics_collector = metrics_collector
        self.name = name
        self.tags = tags or {}
        self.start_time = None
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.start_time:
            duration = time.time() - self.start_time
            self.metrics_collector.record_timer(self.name, duration, self.tags)

# Decorator for timing functions
def timed_operation(metrics_collector: MetricsCollector, name: Optional[str] = None):
    """Decorator for timing function execution"""
    def decorator(func):
        operation_name = name or f"{func.__module__}.{func.__name__}"
        
        def wrapper(*args, **kwargs):
            with Timer(metrics_collector, operation_name):
                return func(*args, **kwargs)
        
        return wrapper
    return decorator

# Global metrics collector instance
metrics_collector = MetricsCollector()

# Convenience functions
def get_metrics_collector() -> MetricsCollector:
    """Get global metrics collector instance"""
    return metrics_collector

def start_metrics_collection():
    """Start global metrics collection"""
    metrics_collector.start_collection()

def stop_metrics_collection():
    """Stop global metrics collection"""
    metrics_collector.stop_collection()

def record_operation_time(operation_name: str, duration: float):
    """Record operation timing"""
    metrics_collector.record_timer(operation_name, duration)

def increment_operation_counter(operation_name: str, count: int = 1):
    """Increment operation counter"""
    metrics_collector.increment_counter(operation_name, count)

def set_system_gauge(gauge_name: str, value: float):
    """Set system gauge value"""
    metrics_collector.set_gauge(gauge_name, value) 