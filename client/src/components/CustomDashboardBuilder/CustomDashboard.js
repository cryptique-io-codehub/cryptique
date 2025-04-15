import React, { useState, useEffect } from 'react';
import { Box, Button, Paper, Typography, IconButton } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import DashboardGrid from './DashboardGrid';
import WidgetConfigDialog from './WidgetConfigDialog';

const defaultWidgets = [
  {
    id: '1',
    type: 'bar',
    title: 'Traffic Sources',
    dataSource: 'trafficSources',
    config: {
      xAxis: 'name',
      series: [
        { dataKey: 'visitors', name: 'Visitors', color: '#8884d8' },
        { dataKey: 'web3Users', name: 'Web3 Users', color: '#82ca9d' }
      ]
    },
    layout: { i: '1', x: 0, y: 0, w: 6, h: 4 }
  },
  {
    id: '2',
    type: 'line',
    title: 'User Engagement',
    dataSource: 'userEngagement',
    config: {
      xAxis: 'date',
      series: [
        { dataKey: 'sessions', name: 'Sessions', color: '#8884d8' },
        { dataKey: 'pageViews', name: 'Page Views', color: '#82ca9d' }
      ]
    },
    layout: { i: '2', x: 6, y: 0, w: 6, h: 4 }
  }
];

const CustomDashboard = () => {
  const [widgets, setWidgets] = useState(defaultWidgets);
  const [isEditing, setIsEditing] = useState(false);
  const [configDialog, setConfigDialog] = useState({
    open: false,
    widget: null
  });

  const handleLayoutChange = (layout) => {
    const updatedWidgets = widgets.map(widget => {
      const newLayout = layout.find(l => l.i === widget.id);
      if (newLayout) {
        return {
          ...widget,
          layout: {
            i: widget.id,
            x: newLayout.x,
            y: newLayout.y,
            w: newLayout.w,
            h: newLayout.h
          }
        };
      }
      return widget;
    });
    setWidgets(updatedWidgets);
  };

  const handleWidgetAdd = (type) => {
    const newWidget = {
      id: Date.now().toString(),
      type,
      title: `New ${type} Widget`,
      dataSource: 'trafficSources',
      config: {
        xAxis: 'name',
        series: [
          { dataKey: 'visitors', name: 'Visitors', color: '#8884d8' }
        ]
      },
      layout: { 
        i: Date.now().toString(), 
        x: 0, 
        y: 0, 
        w: 6, 
        h: 4 
      }
    };
    setWidgets([...widgets, newWidget]);
  };

  const handleWidgetRemove = (id) => {
    setWidgets(widgets.filter(widget => widget.id !== id));
  };

  const handleWidgetConfigure = (widget) => {
    setConfigDialog({ open: true, widget });
  };

  const handleConfigSave = (updatedWidget) => {
    setWidgets(widgets.map(w => 
      w.id === updatedWidget.id ? updatedWidget : w
    ));
    setConfigDialog({ open: false, widget: null });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3 
      }}>
        <Typography variant="h4">Custom Dashboard</Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleWidgetAdd('bar')}
            sx={{ mr: 2 }}
          >
            Add Widget
          </Button>
          <IconButton
            color={isEditing ? 'primary' : 'default'}
            onClick={() => setIsEditing(!isEditing)}
          >
            <EditIcon />
          </IconButton>
        </Box>
      </Box>

      <Paper elevation={2} sx={{ p: 2, minHeight: '600px' }}>
        <DashboardGrid
          widgets={widgets}
          onLayoutChange={handleLayoutChange}
          onWidgetAdd={handleWidgetAdd}
          onWidgetRemove={handleWidgetRemove}
          onWidgetConfigure={handleWidgetConfigure}
          isEditing={isEditing}
        />
      </Paper>

      <WidgetConfigDialog
        open={configDialog.open}
        widget={configDialog.widget}
        onClose={() => setConfigDialog({ open: false, widget: null })}
        onSave={handleConfigSave}
      />
    </Box>
  );
};

export default CustomDashboard; 