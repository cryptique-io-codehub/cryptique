import React, { useState } from 'react';
import { Box, Button, Paper } from '@mui/material';
import { Edit as EditIcon, Save as SaveIcon } from '@mui/icons-material';
import DashboardGrid from './DashboardGrid';
import WidgetPalette from './WidgetPalette';
import WidgetConfigurationDialog from './WidgetConfigurationDialog';

const DashboardBuilder = () => {
  const [widgets, setWidgets] = useState([]);
  const [isEditing, setIsEditing] = useState(true);
  const [selectedWidget, setSelectedWidget] = useState(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  const handleDrop = (item, position) => {
    const newWidget = {
      id: Date.now().toString(),
      type: item.type,
      position: {
        x: position.x,
        y: position.y,
        w: position.w,
        h: position.h,
      },
    };
    setWidgets([...widgets, newWidget]);
  };

  const handleLayoutChange = (layout) => {
    const updatedWidgets = widgets.map((widget) => {
      const newLayout = layout.find((item) => item.i === widget.id);
      if (newLayout) {
        return {
          ...widget,
          position: {
            x: newLayout.x,
            y: newLayout.y,
            w: newLayout.w,
            h: newLayout.h,
          },
        };
      }
      return widget;
    });
    setWidgets(updatedWidgets);
  };

  const handleRemove = (widgetId) => {
    setWidgets(widgets.filter((widget) => widget.id !== widgetId));
  };

  const handleConfigure = (widget) => {
    setSelectedWidget(widget);
    setConfigDialogOpen(true);
  };

  const handleSaveConfig = (updatedWidget) => {
    setWidgets(
      widgets.map((widget) =>
        widget.id === updatedWidget.id ? updatedWidget : widget
      )
    );
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 200px)' }}>
      {isEditing && <WidgetPalette />}
      
      <Box sx={{ flex: 1, position: 'relative' }}>
        <Paper
          elevation={2}
          sx={{
            p: 2,
            mb: 2,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Button
            variant="contained"
            startIcon={isEditing ? <SaveIcon /> : <EditIcon />}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Save Dashboard' : 'Edit Dashboard'}
          </Button>
        </Paper>

        <DashboardGrid
          widgets={widgets}
          onDrop={handleDrop}
          onLayoutChange={handleLayoutChange}
          onRemove={handleRemove}
          onConfigure={handleConfigure}
          isEditing={isEditing}
        />
      </Box>

      <WidgetConfigurationDialog
        open={configDialogOpen}
        onClose={() => setConfigDialogOpen(false)}
        widget={selectedWidget}
        onSave={handleSaveConfig}
      />
    </Box>
  );
};

export default DashboardBuilder; 