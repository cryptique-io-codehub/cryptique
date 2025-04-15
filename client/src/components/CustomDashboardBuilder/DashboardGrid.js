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
import { BarChart, LineChart, PieChart, ScatterChart, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { 
  Analytics, 
  TrafficSource, 
  UserEngagement, 
  WalletActivity,
  ConversionMetrics,
  SessionData,
  OnChainData
} from '../../utils/analyticsData';

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

  const renderWidget = (widget) => {
    const { id, type, title, dataSource, config } = widget;
    let chartData = [];

    switch (dataSource) {
      case 'trafficSources':
        chartData = analyticsData.trafficSources;
        break;
      case 'userEngagement':
        chartData = analyticsData.userEngagement;
        break;
      case 'walletActivity':
        chartData = analyticsData.walletActivity;
        break;
      case 'conversionMetrics':
        chartData = analyticsData.conversionMetrics;
        break;
      case 'sessionData':
        chartData = analyticsData.sessionData;
        break;
      case 'onChainData':
        chartData = analyticsData.onChainData;
        break;
      default:
        chartData = [];
    }

    const renderChart = () => {
      const commonProps = {
        data: chartData,
        margin: { top: 20, right: 30, left: 20, bottom: 5 }
      };

      switch (type) {
        case 'bar':
          return (
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={config.xAxis} />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              {config.series.map((series, index) => (
                <Bar
                  key={index}
                  dataKey={series.dataKey}
                  fill={series.color}
                  name={series.name}
                />
              ))}
            </BarChart>
          );
        case 'line':
          return (
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={config.xAxis} />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              {config.series.map((series, index) => (
                <Line
                  key={index}
                  type="monotone"
                  dataKey={series.dataKey}
                  stroke={series.color}
                  name={series.name}
                />
              ))}
            </LineChart>
          );
        case 'text':
          return (
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {config.title}
              </Typography>
              <Typography variant="body1">
                {config.content}
              </Typography>
            </Box>
          );
        case 'table':
          return (
            <Box sx={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {config.columns.map((col, index) => (
                      <th key={index} style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {config.columns.map((col, colIndex) => (
                        <td key={colIndex} style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                          {row[col]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          );
        default:
          return null;
      }
    };

    return (
      <DashboardPaper elevation={2}>
        <WidgetHeader>
          <Typography variant="h6">{title}</Typography>
          {isEditing && (
            <WidgetToolbar>
              <Tooltip title="Configure">
                <IconButton size="small" onClick={() => handleConfigOpen(widget)}>
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Remove">
                <IconButton size="small" onClick={() => onWidgetRemove(id)}>
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </WidgetToolbar>
          )}
        </WidgetHeader>
        <ChartContainer>
          {renderChart()}
        </ChartContainer>
      </DashboardPaper>
    );
  };

  return (
    <>
      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: widgets.map(w => w.layout) }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={100}
        onLayoutChange={onLayoutChange}
        isDraggable={isEditing}
        isResizable={isEditing}
        draggableHandle=".drag-handle"
      >
        {widgets.map(widget => (
          <div key={widget.id} className="widget-container">
            <div className="drag-handle" style={{ cursor: 'move' }}>
              <DragIcon />
            </div>
            {renderWidget(widget)}
          </div>
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
    </>
  );
};

export default DashboardGrid; 