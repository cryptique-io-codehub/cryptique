import React from 'react';
import { Box, Drawer, AppBar, Toolbar, Typography, List, ListItem, ListItemIcon, ListItemText, IconButton } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import PsychologyIcon from '@mui/icons-material/Psychology';
import MenuIcon from '@mui/icons-material/Menu';
import BarChartIcon from '@mui/icons-material/BarChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import GroupsIcon from '@mui/icons-material/Groups';
import CampaignIcon from '@mui/icons-material/Campaign';
import TransformIcon from '@mui/icons-material/Transform';
import AdsClickIcon from '@mui/icons-material/AdsClick';
import HistoryIcon from '@mui/icons-material/History';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LanguageIcon from '@mui/icons-material/Language';
import { useState } from 'react';

const drawerWidth = 240;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: `-${drawerWidth}px`,
    ...(open && {
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: 0,
    }),
  }),
);

const menuItems = [
  {
    text: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/dashboard'
  },
  {
    text: 'Off-Chain Analytics',
    icon: <BarChartIcon />,
    path: '/dashboard/offchain'
  },
  {
    text: 'On-Chain Explorer',
    icon: <TimelineIcon />,
    path: '/dashboard/onchain'
  },
  {
    text: 'KOL Intelligence',
    icon: <GroupsIcon />,
    path: '/dashboard/kol'
  },
  {
    text: 'Campaigns',
    icon: <CampaignIcon />,
    path: '/dashboard/campaigns'
  },
  {
    text: 'Conversion Events',
    icon: <TransformIcon />,
    path: '/dashboard/conversion-events'
  },
  {
    text: 'Advertise',
    icon: <AdsClickIcon />,
    path: '/dashboard/advertise'
  },
  {
    text: 'History',
    icon: <HistoryIcon />,
    path: '/dashboard/history'
  },
  {
    text: 'Import Users',
    icon: <PersonAddIcon />,
    path: '/dashboard/importusers'
  },
  {
    text: 'Manage Websites',
    icon: <LanguageIcon />,
    path: '/dashboard/managewebsites'
  },
  {
    text: 'Custom Dashboard',
    icon: <DashboardCustomizeIcon />,
    path: '/dashboard/custom-dashboard'
  },
  {
    text: 'CQ Intelligence',
    icon: <PsychologyIcon />,
    path: '/dashboard/cq-intelligence'
  }
];

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(true);

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Cryptique
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="persistent"
        anchor="left"
        open={open}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {menuItems.map((item) => (
              <ListItem
                button
                key={item.text}
                onClick={() => navigate(item.path)}
                selected={location.pathname === item.path}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      <Main open={open}>
        <Toolbar />
        <Outlet />
      </Main>
    </Box>
  );
};

export default Layout; 