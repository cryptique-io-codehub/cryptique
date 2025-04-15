import React, { useState, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import DashboardGrid from './DashboardGrid';
import WidgetPalette from './WidgetPalette';
import { Box, Button, Typography } from '@mui/material';
import { Save, Add } from '@mui/icons-material';

const DashboardBuilder = () => {
  const [widgets, setWidgets] = useState([]);
  const [isEditing, setIsEditing] = useState(true);

  const handleDrop = useCallback((item, position) => {
    setWidgets(prev => [...prev, { ...item, position }]);
  }, []);

  const handleMove = useCallback((id, newPosition) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === id ? { ...widget, position: newPosition } : widget
    ));
  }, []);

  const handleRemove = useCallback((id) => {
    setWidgets(prev => prev.filter(widget => widget.id !== id));
  }, []);

  const handleSave = () => {
    // Save dashboard configuration to backend
    console.log('Saving dashboard:', widgets);
    setIsEditing(false);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Custom Dashboard Builder</Typography>
          <Box>
            {isEditing ? (
              <Button
                variant="contained"
                color="primary"
                startIcon={<Save />}
                onClick={handleSave}
              >
                Save Dashboard
              </Button>
            ) : (
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={() => setIsEditing(true)}
              >
                Edit Dashboard
              </Button>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 3 }}>
          {isEditing && <WidgetPalette />}
          <DashboardGrid
            widgets={widgets}
            onDrop={handleDrop}
            onMove={handleMove}
            onRemove={handleRemove}
            isEditing={isEditing}
          />
        </Box>
      </Box>
    </DndProvider>
  );
};

export default DashboardBuilder; 