import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Box,
  Tabs,
  Tab,
  Typography
} from '@mui/material';

const WidgetConfigDialog = ({ open, onClose, onSave, widget }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [config, setConfig] = useState(widget?.config || {});

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleConfigChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    onSave(config);
  };

  const renderGeneralConfig = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Title"
          value={config.title || ''}
          onChange={(e) => handleConfigChange('title', e.target.value)}
        />
      </Grid>
    </Grid>
  );

  const renderChartConfig = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <FormControl fullWidth>
          <InputLabel>Chart Type</InputLabel>
          <Select
            value={config.type || 'line'}
            onChange={(e) => handleConfigChange('type', e.target.value)}
          >
            <MenuItem value="line">Line Chart</MenuItem>
            <MenuItem value="bar">Bar Chart</MenuItem>
            <MenuItem value="pie">Pie Chart</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="X-Axis Field"
          value={config.xAxis || ''}
          onChange={(e) => handleConfigChange('xAxis', e.target.value)}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Y-Axis Field"
          value={config.yAxis || ''}
          onChange={(e) => handleConfigChange('yAxis', e.target.value)}
        />
      </Grid>
    </Grid>
  );

  const renderTableConfig = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Columns (comma-separated)"
          value={config.columns?.join(',') || ''}
          onChange={(e) => handleConfigChange('columns', e.target.value.split(','))}
        />
      </Grid>
      <Grid item xs={12}>
        <FormControl fullWidth>
          <InputLabel>Pagination</InputLabel>
          <Select
            value={config.pagination ? 'true' : 'false'}
            onChange={(e) => handleConfigChange('pagination', e.target.value === 'true')}
          >
            <MenuItem value="true">Enabled</MenuItem>
            <MenuItem value="false">Disabled</MenuItem>
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );

  const renderMetricConfig = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <FormControl fullWidth>
          <InputLabel>Value Format</InputLabel>
          <Select
            value={config.format || 'number'}
            onChange={(e) => handleConfigChange('format', e.target.value)}
          >
            <MenuItem value="number">Number</MenuItem>
            <MenuItem value="currency">Currency</MenuItem>
            <MenuItem value="percent">Percentage</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Unit"
          value={config.unit || ''}
          onChange={(e) => handleConfigChange('unit', e.target.value)}
        />
      </Grid>
      <Grid item xs={12}>
        <FormControl fullWidth>
          <InputLabel>Show Trend</InputLabel>
          <Select
            value={config.showTrend ? 'true' : 'false'}
            onChange={(e) => handleConfigChange('showTrend', e.target.value === 'true')}
          >
            <MenuItem value="true">Yes</MenuItem>
            <MenuItem value="false">No</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <FormControl fullWidth>
          <InputLabel>Show Progress</InputLabel>
          <Select
            value={config.showProgress ? 'true' : 'false'}
            onChange={(e) => handleConfigChange('showProgress', e.target.value === 'true')}
          >
            <MenuItem value="true">Yes</MenuItem>
            <MenuItem value="false">No</MenuItem>
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );

  const renderConfigContent = () => {
    switch (widget?.type) {
      case 'chart':
        return renderChartConfig();
      case 'table':
        return renderTableConfig();
      case 'metric':
        return renderMetricConfig();
      default:
        return (
          <Typography color="textSecondary">
            No configuration options available for this widget type.
          </Typography>
        );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Configure Widget</DialogTitle>
      <DialogContent>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="General" />
          <Tab label="Widget Specific" />
        </Tabs>
        <Box sx={{ mt: 2 }}>
          {activeTab === 0 && renderGeneralConfig()}
          {activeTab === 1 && renderConfigContent()}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default WidgetConfigDialog; 