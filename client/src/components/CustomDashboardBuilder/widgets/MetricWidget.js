import React from 'react';
import {
  Box,
  Typography,
  Paper,
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon
} from '@mui/icons-material';

const MetricWidget = ({ data, config }) => {
  const {
    title,
    value,
    previousValue,
    format = 'number',
    unit = '',
    target,
    showTrend = true,
    showProgress = false
  } = config;

  const calculateTrend = () => {
    if (!previousValue || previousValue === 0) return 0;
    return ((value - previousValue) / previousValue) * 100;
  };

  const formatValue = (val) => {
    if (format === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(val);
    }
    if (format === 'percent') {
      return `${val.toFixed(1)}%`;
    }
    return val.toLocaleString();
  };

  const trend = calculateTrend();
  const progress = target ? (value / target) * 100 : 0;

  const getTrendIcon = () => {
    if (trend > 0) return <TrendingUpIcon color="success" />;
    if (trend < 0) return <TrendingDownIcon color="error" />;
    return <TrendingFlatIcon color="action" />;
  };

  return (
    <Paper sx={{ height: '100%', p: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {title && (
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            {title}
          </Typography>
        )}
        
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Typography variant="h4" component="div" sx={{ mb: 1 }}>
            {formatValue(value)}{unit}
          </Typography>
          
          {showTrend && previousValue && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getTrendIcon()}
              <Typography
                variant="body2"
                color={trend > 0 ? 'success.main' : trend < 0 ? 'error.main' : 'text.secondary'}
              >
                {Math.abs(trend).toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                vs previous
              </Typography>
            </Box>
          )}
        </Box>

        {showProgress && target && (
          <Box sx={{ mt: 2 }}>
            <Tooltip title={`${progress.toFixed(1)}% of target`}>
              <LinearProgress
                variant="determinate"
                value={Math.min(progress, 100)}
                color={progress >= 100 ? 'success' : 'primary'}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Tooltip>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default MetricWidget; 