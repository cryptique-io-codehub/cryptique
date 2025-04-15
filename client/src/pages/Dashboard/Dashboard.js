import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Container, AppBar, Toolbar, Typography, Button, IconButton, Avatar, Paper, Grid } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import BarChartIcon from '@mui/icons-material/BarChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import PsychologyIcon from '@mui/icons-material/Psychology';
import GroupsIcon from '@mui/icons-material/Groups';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import CampaignIcon from '@mui/icons-material/Campaign';
import TransformIcon from '@mui/icons-material/Transform';
import AdsClickIcon from '@mui/icons-material/AdsClick';
import HistoryIcon from '@mui/icons-material/History';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LanguageIcon from '@mui/icons-material/Language';

const Dashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('User') || '{}');
  const team = localStorage.getItem('selectedTeam') || '';

  const featureCards = [
    {
      title: "Off-Chain Analytics",
      description: "Track user journeys, conversions, and traffic sources across your website.",
      icon: <BarChartIcon color="primary" fontSize="large" />,
      path: "/offchain",
    },
    {
      title: "On-Chain Explorer",
      description: "Analyze blockchain data and monitor wallet activity related to your project.",
      icon: <TimelineIcon color="primary" fontSize="large" />,
      path: "/onchain",
    },
    {
      title: "CQ Intelligence",
      description: "Get insights and intelligence on your crypto audience and market position.",
      icon: <PsychologyIcon color="primary" fontSize="large" />,
      path: "/cq-intelligence",
    },
    {
      title: "KOL Intelligence",
      description: "Access advanced KOL data and on-chain insights into your social dynamics.",
      icon: <GroupsIcon color="primary" fontSize="large" />,
      path: "/kol",
    },
    {
      title: "Custom Dashboard",
      description: "Create personalized dashboards with your most important metrics and widgets.",
      icon: <DashboardCustomizeIcon color="primary" fontSize="large" />,
      path: "/custom-dashboard",
    },
    {
      title: "Campaigns",
      description: "Measure performance & retention of all your marketing campaigns.",
      icon: <CampaignIcon color="primary" fontSize="large" />,
      path: "/campaigns",
    },
  ];

  const secondaryFeatures = [
    { title: "Conversion Events", icon: <TransformIcon />, path: "/conversion-events" },
    { title: "Advertise", icon: <AdsClickIcon />, path: "/advertise" },
    { title: "History", icon: <HistoryIcon />, path: "/history" },
    { title: "Import Users", icon: <PersonAddIcon />, path: "/importusers" },
    { title: "Manage Websites", icon: <LanguageIcon />, path: "/managewebsites" },
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* App Bar */}
      <AppBar position="static" sx={{ bgcolor: "#1a2437" }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Cryptique
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            Team: {team}
          </Typography>
          <IconButton color="inherit">
            <NotificationsIcon />
          </IconButton>
          <IconButton color="inherit" onClick={() => navigate('/settings')}>
            <SettingsIcon />
          </IconButton>
          <IconButton color="inherit">
            {user.avatar ? (
              <Avatar src={user.avatar} alt={user.name} sx={{ width: 32, height: 32 }} />
            ) : (
              <Avatar sx={{ width: 32, height: 32 }}>{user.name?.[0] || 'U'}</Avatar>
            )}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Hero Section */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 4, 
            mb: 4, 
            borderRadius: 2, 
            bgcolor: "#e4c795", 
            display: "flex", 
            flexDirection: { xs: "column", md: "row" }, 
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
              One Stop for your Web3 Marketing
            </Typography>
            <Typography variant="body1" paragraph>
              Easy onboarding<br />
              One-min integration<br />
              No-code insights
            </Typography>
            <Button 
              variant="contained" 
              sx={{ 
                bgcolor: "white", 
                color: "#1a2437", 
                "&:hover": { bgcolor: "#f5f5f5" } 
              }}
            >
              Integrate your website/app now
            </Button>
          </Box>
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', mt: { xs: 3, md: 0 } }}>
            <Box 
              component="img"
              src="https://placehold.co/200x200/gold/white?text=CQ"
              alt="Cryptique logo"
              sx={{ maxWidth: 200, height: 'auto' }}
            />
          </Box>
        </Paper>

        {/* Tab Navigation */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4, display: 'flex', justifyContent: 'center' }}>
          <Button sx={{ fontWeight: 'bold', borderBottom: '2px solid #4a90e2', borderRadius: 0, px: 3 }}>
            Overview
          </Button>
          <Button sx={{ px: 3 }} onClick={() => navigate('/offchain')}>
            Analytics
          </Button>
          <Button sx={{ px: 3 }} onClick={() => navigate('/campaigns')}>
            Campaigns
          </Button>
        </Box>

        {/* Main Feature Cards */}
        <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4, mb: 2 }}>
          Main Features
        </Typography>
        <Grid container spacing={3}>
          {featureCards.map((card, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Paper 
                elevation={1} 
                sx={{ 
                  p: 3, 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    boxShadow: 3,
                    transform: 'translateY(-4px)'
                  }
                }}
                onClick={() => navigate(card.path)}
              >
                <Box sx={{ display: 'flex', mb: 2 }}>
                  {card.icon}
                </Box>
                <Typography variant="subtitle1" component="h3" gutterBottom fontWeight="bold">
                  {card.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                  {card.description}
                </Typography>
                <Box sx={{ mt: 'auto', textAlign: 'right' }}>
                  <Button color="primary" sx={{ px: 0 }}>
                    Explore →
                  </Button>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Secondary Features */}
        <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4, mb: 2 }}>
          Additional Tools
        </Typography>
        <Grid container spacing={2}>
          {secondaryFeatures.map((feature, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={feature.icon}
                fullWidth
                sx={{ 
                  py: 1.5, 
                  px: 2, 
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  borderColor: 'rgba(0,0,0,0.12)'
                }}
                onClick={() => navigate(feature.path)}
              >
                {feature.title}
              </Button>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard;