import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Tabs,
  Tab,
} from '@mui/material';

const WidgetConfigurationDialog = ({ open, onClose, widget, onSave }) => {
  const [title, setTitle] = useState(widget?.title || '');
  const [tabValue, setTabValue] = useState(0);

  const handleSave = () => {
    onSave({
      ...widget,
      title,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Configure Widget</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Widget Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="General" />
            <Tab label="Data" />
            <Tab label="Appearance" />
          </Tabs>

          <Box sx={{ mt: 2 }}>
            {tabValue === 0 && (
              <Typography variant="body2" color="text.secondary">
                General settings for the widget
              </Typography>
            )}
            {tabValue === 1 && (
              <Typography variant="body2" color="text.secondary">
                Data source and configuration
              </Typography>
            )}
            {tabValue === 2 && (
              <Typography variant="body2" color="text.secondary">
                Visual appearance settings
              </Typography>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WidgetConfigurationDialog; 