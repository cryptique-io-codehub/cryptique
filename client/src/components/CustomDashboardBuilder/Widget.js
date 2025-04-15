import React, { useState } from 'react';
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
import WidgetToolbar from './WidgetToolbar';
import WidgetConfigDialog from './WidgetConfigDialog';
import ChartWidget from './widgets/ChartWidget';
import TableWidget from './widgets/TableWidget';
import MetricWidget from './widgets/MetricWidget';

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

const Widget = ({ 
  id,
  type,
  title,
  data,
  config,
  onUpdate,
  onDelete,
  onDuplicate,
  isEditing
}) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const handleConfigSave = (newConfig) => {
    onUpdate(id, { ...config, ...newConfig });
    setIsConfigOpen(false);
  };

  const handleDelete = () => {
    onDelete(id);
  };

  const handleDuplicate = () => {
    onDuplicate(id);
  };

  const renderWidgetContent = () => {
    switch (type) {
      case 'chart':
        return <ChartWidget data={data} config={config} />;
      case 'table':
        return <TableWidget data={data} config={config} />;
      case 'metric':
        return <MetricWidget data={data} config={config} />;
      default:
        return (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography color="textSecondary">
              Unsupported widget type: {type}
            </Typography>
          </Box>
        );
    }
  };

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        height: '100%',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <WidgetToolbar
        onConfigure={() => setIsConfigOpen(true)}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        isEditing={isEditing}
      />
      
      {renderWidgetContent()}

      <WidgetConfigDialog
        open={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onSave={handleConfigSave}
        widget={{ type, title, config }}
      />
    </Paper>
  );
};

export default Widget; 