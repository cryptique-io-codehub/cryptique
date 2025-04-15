import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import DashboardBuilder from '../../components/CustomDashboardBuilder/DashboardBuilder';

const CustomDashboard = () => {
  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Custom Dashboard Builder
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Create and customize your own dashboard by dragging and dropping widgets.
        </Typography>
        <DashboardBuilder />
      </Box>
    </Container>
  );
};

export default CustomDashboard; 