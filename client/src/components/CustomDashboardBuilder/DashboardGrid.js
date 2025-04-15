import React from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { Box, Paper } from '@mui/material';
import Widget from './Widget';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const DashboardGrid = ({ widgets, onDrop, onMove, onRemove, isEditing }) => {
  const handleLayoutChange = (layout) => {
    layout.forEach(item => {
      const widget = widgets.find(w => w.id === item.i);
      if (widget) {
        onMove(widget.id, { x: item.x, y: item.y, w: item.w, h: item.h });
      }
    });
  };

  const handleDrop = (layout, item, e) => {
    const widgetType = e.dataTransfer.getData('widgetType');
    const position = { x: item.x, y: item.y, w: item.w, h: item.h };
    onDrop({ id: Date.now().toString(), type: widgetType }, position);
  };

  return (
    <Box sx={{ flex: 1, minHeight: '600px' }}>
      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: widgets.map(w => ({
          i: w.id,
          x: w.position.x,
          y: w.position.y,
          w: w.position.w,
          h: w.position.h,
          minW: 2,
          minH: 2,
          maxW: 12,
          maxH: 12
        })) }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={30}
        isDraggable={isEditing}
        isResizable={isEditing}
        onLayoutChange={handleLayoutChange}
        onDrop={handleDrop}
        droppingItem={{ i: 'drop', w: 4, h: 4 }}
        useCSSTransforms={true}
      >
        {widgets.map(widget => (
          <Paper
            key={widget.id}
            elevation={2}
            sx={{
              p: 2,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <Widget
              widget={widget}
              onRemove={onRemove}
              isEditing={isEditing}
            />
          </Paper>
        ))}
      </ResponsiveGridLayout>
    </Box>
  );
};

export default DashboardGrid; 