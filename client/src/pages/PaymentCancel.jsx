import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Typography, Paper, Button, Box } from '@mui/material';
import { XCircle } from 'lucide-react';

const PaymentCancelPage = () => {
  const navigate = useNavigate();
  
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
          <XCircle size={60} color="#F44336" />
        </Box>
        
        <Typography variant="h4" gutterBottom>
          Payment Cancelled
        </Typography>
        
        <Typography variant="body1" paragraph sx={{ maxWidth: '80%', mx: 'auto', mb: 4 }}>
          Your payment process was cancelled. No charges have been made to your account.
          If you have any questions or need assistance, please contact our support team.
        </Typography>
        
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            color="primary"
            component={Link}
            to="/settings/billing"
          >
            Return to Billing
          </Button>
          <Button
            variant="contained"
            color="primary"
            component={Link}
            to="/support"
          >
            Contact Support
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default PaymentCancelPage; 