import React from 'react';
import { Box, Paper, Typography, List, ListItem, ListItemText, ListItemIcon } from '@mui/material';
import { DragIndicator } from '@mui/icons-material';

const availableWidgets = [
  { type: 'lineChart', label: 'Line Chart', description: 'Display data trends over time' },
  { type: 'barChart', label: 'Bar Chart', description: 'Compare data across categories' },
  { type: 'pieChart', label: 'Pie Chart', description: 'Show data distribution' },
  { type: 'table', label: 'Data Table', description: 'Display data in tabular format' },
  { type: 'metric', label: 'Metric Card', description: 'Show key performance indicators' },
  { type: 'map', label: 'Map', description: 'Display geographical data' }
];

const WidgetPalette = () => {
  const handleDragStart = (e, widgetType) => {
    e.dataTransfer.setData('widgetType', widgetType);
  };

  return (
    <Paper elevation={2} sx={{ width: 250, p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Available Widgets
      </Typography>
      <List>
        {availableWidgets.map((widget) => (
          <ListItem
            key={widget.type}
            draggable
            onDragStart={(e) => handleDragStart(e, widget.type)}
            sx={{
              cursor: 'grab',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
              mb: 1,
              borderRadius: 1,
            }}
          >
            <ListItemIcon>
              <DragIndicator />
            </ListItemIcon>
            <ListItemText
              primary={widget.label}
              secondary={widget.description}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default WidgetPalette; 