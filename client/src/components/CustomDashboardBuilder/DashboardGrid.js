import React, { useState, useEffect } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { 
  Paper, 
  Typography, 
  Box, 
  IconButton, 
  Tooltip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  DragIndicator as DragIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Edit as EditIcon,
  BarChart as BarChartIcon,
  ShowChart as LineChartIcon,
  PieChart as PieChartIcon,
  ScatterPlot as ScatterIcon,
  AreaChart as AreaChartIcon,
  TextFields as TextIcon,
  TableChart as TableIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { 
  BarChart, 
  LineChart, 
  PieChart, 
  ScatterChart, 
  AreaChart, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend,
  Bar,
  Line,
  Pie,
  Scatter,
  Area
} from 'recharts';
import { 
  Analytics, 
  TrafficSource, 
  UserEngagement, 
  WalletActivity,
  ConversionMetrics,
  SessionData,
  OnChainData
} from '../../utils/analyticsData';
import Widget from './Widget';

const ResponsiveGridLayout = WidthProvider(Responsive);

const DashboardPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  background: 'linear-gradient(145deg, #ffffff, #f0f0f0)',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 12px rgba(0, 0, 0, 0.15)',
  },
}));

const WidgetHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(2),
  padding: theme.spacing(1),
  background: 'rgba(0, 0, 0, 0.02)',
  borderRadius: theme.shape.borderRadius,
}));

const ChartContainer = styled(Box)({
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: '8px',
});

const WidgetToolbar = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  right: 0,
  display: 'flex',
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  background: 'rgba(255, 255, 255, 0.9)',
  borderRadius: theme.shape.borderRadius,
  opacity: 0,
  transition: 'opacity 0.2s',
  '&:hover': {
    opacity: 1,
  },
}));

const DashboardGrid = ({ 
  widgets, 
  onLayoutChange, 
  onWidgetAdd, 
  onWidgetRemove,
  onWidgetConfigure,
  isEditing 
}) => {
  const [analyticsData, setAnalyticsData] = useState({
    trafficSources: [],
    userEngagement: [],
    walletActivity: [],
    conversionMetrics: [],
    sessionData: [],
    onChainData: []
  });

  const [configDialog, setConfigDialog] = useState({
    open: false,
    widget: null
  });

  useEffect(() => {
    const fetchData = async () => {
      const [
        trafficData,
        engagementData,
        walletData,
        conversionData,
        sessionData,
        onChainData
      ] = await Promise.all([
        TrafficSource.getData(),
        UserEngagement.getData(),
        WalletActivity.getData(),
        ConversionMetrics.getData(),
        SessionData.getData(),
        OnChainData.getData()
      ]);

      setAnalyticsData({
        trafficSources: trafficData,
        userEngagement: engagementData,
        walletActivity: walletData,
        conversionMetrics: conversionData,
        sessionData: sessionData,
        onChainData: onChainData
      });
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleConfigOpen = (widget) => {
    setConfigDialog({ open: true, widget });
  };

  const handleConfigClose = () => {
    setConfigDialog({ open: false, widget: null });
  };

  const handleLayoutChange = (layout) => {
    onLayoutChange(layout);
  };

  const handleDrop = (layout, layoutItem, _event) => {
    // Handle widget drop from palette
    const newWidget = {
      id: layoutItem.i,
      type: layoutItem.type,
      title: `New ${layoutItem.type} Widget`,
      config: {
        // Default config based on widget type
        ...(layoutItem.type === 'chart' && {
          type: 'line',
          xAxis: 'x',
          yAxis: 'y'
        }),
        ...(layoutItem.type === 'table' && {
          columns: [],
          pagination: false
        }),
        ...(layoutItem.type === 'metric' && {
          format: 'number',
          showTrend: true,
          showProgress: false
        })
      }
    };
    onWidgetAdd(newWidget);
  };

  return (
    <Box sx={{ height: '100%', minHeight: '600px' }}>
      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: widgets.map(w => w.layout) }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={30}
        margin={[16, 16]}
        containerPadding={[16, 16]}
        isDraggable={isEditing}
        isResizable={isEditing}
        onLayoutChange={handleLayoutChange}
        onDrop={handleDrop}
        droppingItem={{ i: 'dropping-item', w: 6, h: 4 }}
        useCSSTransforms={true}
      >
        {widgets.map(widget => (
          <Box key={widget.id} sx={{ height: '100%' }}>
            <Widget
              id={widget.id}
              type={widget.type}
              title={widget.title}
              data={widget.data}
              config={widget.config}
              onUpdate={(id, updates) => {
                const updatedWidgets = widgets.map(w => 
                  w.id === id ? { ...w, ...updates } : w
                );
                onLayoutChange(updatedWidgets.map(w => w.layout));
              }}
              onDelete={onWidgetRemove}
              onDuplicate={() => {
                const newWidget = {
                  ...widget,
                  id: Date.now().toString(),
                  layout: {
                    ...widget.layout,
                    i: Date.now().toString()
                  }
                };
                onWidgetAdd(newWidget);
              }}
              isEditing={isEditing}
            />
          </Box>
        ))}
      </ResponsiveGridLayout>

      <Dialog open={configDialog.open} onClose={handleConfigClose} maxWidth="md" fullWidth>
        <DialogTitle>Configure Widget</DialogTitle>
        <DialogContent>
          <Tabs value={0}>
            <Tab label="Data" />
            <Tab label="Appearance" />
            <Tab label="Advanced" />
          </Tabs>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Data Source</InputLabel>
              <Select
                value={configDialog.widget?.dataSource || ''}
                onChange={(e) => {/* Handle change */}}
              >
                <MenuItem value="trafficSources">Traffic Sources</MenuItem>
                <MenuItem value="userEngagement">User Engagement</MenuItem>
                <MenuItem value="walletActivity">Wallet Activity</MenuItem>
                <MenuItem value="conversionMetrics">Conversion Metrics</MenuItem>
                <MenuItem value="sessionData">Session Data</MenuItem>
                <MenuItem value="onChainData">On-Chain Data</MenuItem>
              </Select>
            </FormControl>
            {/* Add more configuration options here */}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfigClose}>Cancel</Button>
          <Button onClick={handleConfigClose} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DashboardGrid; 