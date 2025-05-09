import React, { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Container, Typography, Paper, Button, Box, CircularProgress } from '@mui/material';
import { CheckCircle } from 'lucide-react';

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const chargeId = queryParams.get('charge_id');
  
  useEffect(() => {
    // Redirect to billing page after 5 seconds
    const timer = setTimeout(() => {
      navigate('/settings/billing');
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [navigate]);
  
  return (
    <Container maxWidth="md" sx={{ mt: 8, mb: 8, textAlign: 'center' }}>
      <Paper elevation={3} sx={{ p: 5, borderRadius: 2 }}>
        <Box sx={{ mb: 3 }}>
          <CheckCircle size={60} color="#4CAF50" />
        </Box>
        
        <Typography variant="h4" gutterBottom>
          Payment Successful!
        </Typography>
        
        <Typography variant="body1" paragraph sx={{ maxWidth: '80%', mx: 'auto', mb: 4 }}>
          Thank you for your subscription. Your payment has been processed successfully, and your subscription is now active.
          {chargeId && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Transaction ID: {chargeId}
            </Typography>
          )}
        </Typography>
        
        <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            You will be automatically redirected to the billing page in 5 seconds...
          </Typography>
          
          <CircularProgress size={20} sx={{ mb: 2 }} />
          
          <Button
            variant="contained"
            color="primary"
            component={Link}
            to="/settings/billing"
            sx={{ mt: 2 }}
          >
            Return to Billing
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default PaymentSuccessPage; 