import React from 'react';
import { Box, IconButton, Paper, Typography } from '@mui/material';
import { Delete, Settings } from '@mui/icons-material';
import { 
  Timeline as LineChartIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  TableChart as TableChartIcon,
  Speed as SpeedIcon,
  Map as MapIcon 
} from '@mui/icons-material';

const getWidgetIcon = (type) => {
  switch (type) {
    case 'lineChart':
      return <LineChartIcon />;
    case 'barChart':
      return <BarChartIcon />;
    case 'pieChart':
      return <PieChartIcon />;
    case 'table':
      return <TableChartIcon />;
    case 'metric':
      return <SpeedIcon />;
    case 'map':
      return <MapIcon />;
    default:
      return null;
  }
};

const Widget = ({ widget, onRemove, onConfigure, isEditing }) => {
  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {isEditing && (
        <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 1 }}>
          <IconButton size="small" onClick={() => onConfigure(widget)}>
            <Settings fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => onRemove(widget.id)}>
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      )}
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        {getWidgetIcon(widget.type)}
        <Typography variant="h6" sx={{ ml: 1 }}>
          {widget.title || 'Widget'}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {widget.type} content will be displayed here
        </Typography>
      </Box>
    </Paper>
  );
};

export default Widget; 