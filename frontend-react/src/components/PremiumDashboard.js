import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import {
  Box, Container, Typography, Card, CardContent, Grid, Paper, 
  Tabs, Tab, Button, Chip, Avatar, LinearProgress, CircularProgress,
  AppBar, Toolbar, IconButton, Drawer, List, ListItem, ListItemIcon, 
  ListItemText, Badge, Divider, Stack, Alert, Fade, Grow, Slide,
  Backdrop, SpeedDial, SpeedDialAction, Tooltip, Fab
} from '@mui/material';
import {
  Dashboard, LocalShipping, Payment, Analytics, Notifications,
  TrendingUp, Warning, CheckCircle, Schedule, LocationOn,
  Thermostat, Speed, Security, Bolt, AccountBalanceWallet,
  Refresh, Settings, MoreVert, Add, Edit
} from '@mui/icons-material';
import { ThemeProvider, createTheme, styled } from '@mui/material/styles';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

// Custom Material-UI Theme with Premium Gradients
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#667eea',
      light: '#764ba2',
      dark: '#4c63d2',
    },
    secondary: {
      main: '#f093fb',
      light: '#f5576c',
      dark: '#c471ed',
    },
    background: {
      default: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      paper: 'rgba(255, 255, 255, 0.95)',
    },
    success: {
      main: '#4facfe',
      light: '#00f2fe',
      dark: '#43e97b',
    },
    error: {
      main: '#fa709a',
      light: '#fee140',
      dark: '#f12711',
    },
    warning: {
      main: '#ffecd2',
      light: '#fcb69f',
      dark: '#ff9a9e',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    h4: {
      fontWeight: 600,
      color: '#2d3748',
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 16,
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(0,0,0,0.1)',
    '0px 4px 8px rgba(0,0,0,0.12)',
    '0px 8px 16px rgba(0,0,0,0.15)',
    '0px 16px 32px rgba(0,0,0,0.18)',
    '0px 24px 48px rgba(0,0,0,0.2)',
    // Add more custom shadows...
    ...Array(19).fill('0px 24px 48px rgba(0,0,0,0.2)')
  ],
});

// Styled Components with Advanced Gradients
const GradientCard = styled(Card)(({ theme, gradient = 'primary' }) => {
  const gradients = {
    primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    success: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    error: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    warning: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    info: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    purple: 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
    ocean: 'linear-gradient(135deg, #2196F3 0%, #21CBF3 100%)',
    sunset: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  };
  
  return {
    background: gradients[gradient],
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '24px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden',
    position: 'relative',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
      pointerEvents: 'none',
    },
    '&:hover': {
      transform: 'translateY(-8px) scale(1.02)',
      boxShadow: '0 32px 64px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1)',
    },
  };
});

const GlassCard = styled(Paper)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.25)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.18)',
  borderRadius: '24px',
  padding: theme.spacing(3),
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    background: 'rgba(255, 255, 255, 0.35)',
    transform: 'translateY(-4px)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
  },
}));

const StatsCard = styled(Card)(({ theme, color = 'primary' }) => {
  const colors = {
    primary: { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadow: 'rgba(102, 126, 234, 0.4)' },
    success: { bg: 'linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%)', shadow: 'rgba(86, 171, 47, 0.4)' },
    error: { bg: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)', shadow: 'rgba(255, 65, 108, 0.4)' },
    warning: { bg: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)', shadow: 'rgba(247, 151, 30, 0.4)' },
    info: { bg: 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)', shadow: 'rgba(116, 185, 255, 0.4)' },
  };
  
  return {
    background: colors[color].bg,
    borderRadius: '20px',
    padding: theme.spacing(3),
    color: 'white',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: `0 10px 30px ${colors[color].shadow}`,
    transition: 'all 0.3s ease',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: '-50%',
      right: '-50%',
      width: '200%',
      height: '200%',
      background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 50%)',
      transform: 'rotate(45deg)',
      transition: 'all 0.6s ease',
    },
    '&:hover': {
      transform: 'translateY(-5px) scale(1.02)',
      boxShadow: `0 20px 40px ${colors[color].shadow}`,
      '&::before': {
        transform: 'rotate(45deg) translate(20%, 20%)',
      },
    },
  };
});

const PremiumDashboard = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [activeTab, setActiveTab] = useState(0);
  const [paymentProcessing, setPaymentProcessing] = useState({});
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Mock data with more realistic values
  const mockData = {
    stats: {
      activeShipments: { value: 89, change: '+12%', trend: 'up' },
      completedToday: { value: 23, change: '+8%', trend: 'up' },
      violations: { value: 12, change: '-15%', trend: 'down' },
      pendingPayments: { value: '450 ADA', change: '+5%', trend: 'up' },
      revenue: { value: '$125,430', change: '+18%', trend: 'up' },
      efficiency: { value: '94.2%', change: '+3%', trend: 'up' }
    },
    shipments: [
      {
        id: 'SHIP-001',
        route: 'New York → Boston',
        status: 'In Transit',
        progress: 75,
        temperature: 2.1,
        location: 'Connecticut',
        eta: '2 hours',
        violations: 0,
        driver: 'John Smith',
        priority: 'high'
      },
      {
        id: 'SHIP-002',
        route: 'Miami → Orlando',
        status: 'Delivered',
        progress: 100,
        temperature: 1.8,
        location: 'Orlando, FL',
        eta: 'Delivered',
        violations: 1,
        driver: 'Maria Garcia',
        priority: 'medium'
      },
      {
        id: 'SHIP-003',
        route: 'Chicago → Detroit',
        status: 'Loading',
        progress: 15,
        temperature: 2.5,
        location: 'Chicago, IL',
        eta: '4 hours',
        violations: 0,
        driver: 'Robert Johnson',
        priority: 'low'
      }
    ],
    invoices: [
      {
        invoiceId: 'INV-001',
        shipmentId: 'SHIP-001',
        amount: 25,
        type: 'Temperature Violation',
        status: 'pending',
        dueDate: '2025-12-01',
        severity: 'critical'
      },
      {
        invoiceId: 'INV-002',
        shipmentId: 'SHIP-002',
        amount: 50,
        type: 'Route Deviation',
        status: 'pending',
        dueDate: '2025-12-02',
        severity: 'major'
      }
    ]
  };

  // Chart data
  const temperatureData = [
    { time: '00:00', temp: 2.1, humidity: 65, optimal: 2.0 },
    { time: '04:00', temp: 2.3, humidity: 63, optimal: 2.0 },
    { time: '08:00', temp: 2.0, humidity: 67, optimal: 2.0 },
    { time: '12:00', temp: 2.4, humidity: 64, optimal: 2.0 },
    { time: '16:00', temp: 2.2, humidity: 66, optimal: 2.0 },
    { time: '20:00', temp: 2.1, humidity: 65, optimal: 2.0 },
  ];

  const violationData = [
    { name: 'Temperature', value: 45, color: '#ff416c' },
    { name: 'Route', value: 30, color: '#f7971e' },
    { name: 'Time', value: 20, color: '#74b9ff' },
    { name: 'Other', value: 5, color: '#a29bfe' }
  ];

  // Payment handler
  const handlePayInvoice = async (invoice) => {
    setPaymentProcessing(prev => ({ ...prev, [invoice.invoiceId]: true }));
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      alert(`Payment successful for ${invoice.invoiceId}!`);
    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setPaymentProcessing(prev => ({ ...prev, [invoice.invoiceId]: false }));
    }
  };

  const StatCard = ({ title, value, change, trend, icon: Icon, color = 'primary' }) => (
    <Grow in timeout={600}>
      <StatsCard color={color}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500 }}>
              {title.toUpperCase()}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mt: 1, mb: 0.5, color: 'white' }}>
              {value}
            </Typography>
            <Box display="flex" alignItems="center">
              <TrendingUp 
                sx={{ 
                  fontSize: 16, 
                  mr: 0.5, 
                  transform: trend === 'down' ? 'rotate(180deg)' : 'none',
                  color: trend === 'up' ? '#4ade80' : '#f87171'
                }} 
              />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {change}
              </Typography>
            </Box>
          </Box>
          <Avatar 
            sx={{ 
              bgcolor: 'rgba(255,255,255,0.2)', 
              width: 60, 
              height: 60,
              backdropFilter: 'blur(10px)'
            }}
          >
            <Icon sx={{ fontSize: 30 }} />
          </Avatar>
        </Box>
      </StatsCard>
    </Grow>
  );

  const ShipmentCard = ({ shipment }) => (
    <Fade in timeout={800}>
      <GlassCard>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {shipment.id}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {shipment.route}
            </Typography>
          </Box>
          <Chip 
            label={shipment.status}
            color={
              shipment.status === 'Delivered' ? 'success' :
              shipment.status === 'In Transit' ? 'primary' : 'warning'
            }
            sx={{ fontWeight: 600 }}
          />
        </Box>

        <LinearProgress 
          variant="determinate" 
          value={shipment.progress} 
          sx={{ 
            height: 8, 
            borderRadius: 4, 
            bgcolor: 'rgba(0,0,0,0.1)',
            '& .MuiLinearProgress-bar': {
              background: 'linear-gradient(90deg, #667eea, #764ba2)',
              borderRadius: 4,
            }
          }} 
        />

        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={6}>
            <Box display="flex" alignItems="center">
              <Thermostat color="primary" sx={{ mr: 1 }} />
              <Box>
                <Typography variant="caption" color="textSecondary">Temperature</Typography>
                <Typography variant="body2" fontWeight={600}>{shipment.temperature}°C</Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box display="flex" alignItems="center">
              <LocationOn color="error" sx={{ mr: 1 }} />
              <Box>
                <Typography variant="caption" color="textSecondary">Location</Typography>
                <Typography variant="body2" fontWeight={600}>{shipment.location}</Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        <Box display="flex" justifyContent="space-between" alignItems="center" mt={3}>
          <Box display="flex" alignItems="center">
            <Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: 'primary.main' }}>
              {shipment.driver.split(' ').map(n => n[0]).join('')}
            </Avatar>
            <Typography variant="body2">{shipment.driver}</Typography>
          </Box>
          <Button 
            variant="contained" 
            size="small"
            sx={{ 
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Track Live
          </Button>
        </Box>
      </GlassCard>
    </Fade>
  );

  const InvoiceCard = ({ invoice }) => (
    <Slide direction="up" in timeout={600}>
      <GlassCard>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {invoice.invoiceId}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {invoice.shipmentId}
            </Typography>
          </Box>
          <Box textAlign="right">
            <Typography variant="h5" fontWeight={700} color="error.main">
              {invoice.amount} ADA
            </Typography>
            <Chip 
              label={invoice.severity.toUpperCase()}
              color={
                invoice.severity === 'critical' ? 'error' :
                invoice.severity === 'major' ? 'warning' : 'info'
              }
              size="small"
            />
          </Box>
        </Box>

        <Alert 
          severity={invoice.severity === 'critical' ? 'error' : 'warning'} 
          sx={{ mb: 2, borderRadius: 2 }}
        >
          {invoice.type}
        </Alert>

        <Stack direction="row" spacing={1}>
          <Button 
            variant="contained" 
            fullWidth
            disabled={paymentProcessing[invoice.invoiceId]}
            onClick={() => handlePayInvoice(invoice)}
            sx={{ 
              background: 'linear-gradient(45deg, #56ab2f, #a8e6cf)',
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600
            }}
            startIcon={
              paymentProcessing[invoice.invoiceId] ? 
              <CircularProgress size={16} color="inherit" /> : 
              <AccountBalanceWallet />
            }
          >
            {paymentProcessing[invoice.invoiceId] ? 'Processing...' : 'Pay with Wallet'}
          </Button>
          <IconButton>
            <MoreVert />
          </IconButton>
        </Stack>
      </GlassCard>
    </Slide>
  );

  const tabs = [
    { label: 'Overview', icon: <Dashboard /> },
    { label: 'Live Tracking', icon: <LocalShipping /> },
    { label: 'Payments', icon: <Payment /> },
    { label: 'Analytics', icon: <Analytics /> },
  ];

  return (
    <ThemeProvider theme={theme}>
      <Box 
        sx={{ 
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
            pointerEvents: 'none',
          }
        }}
      >
        {/* Premium AppBar */}
        <AppBar 
          position="static" 
          elevation={0}
          sx={{ 
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          <Toolbar>
            <Typography variant="h5" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
              Smart Freight Management
            </Typography>
            <Badge badgeContent={4} color="error" sx={{ mr: 2 }}>
              <Notifications sx={{ color: 'white' }} />
            </Badge>
            <IconButton color="inherit">
              <Settings />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ py: 4, position: 'relative', zIndex: 1 }}>
          {/* Premium Tabs */}
          <Box sx={{ mb: 4 }}>
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{
                '& .MuiTabs-indicator': {
                  background: 'linear-gradient(45deg, #fff, rgba(255,255,255,0.8))',
                  height: 3,
                  borderRadius: 2,
                },
                '& .MuiTab-root': {
                  color: 'rgba(255,255,255,0.7)',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&.Mui-selected': {
                    color: 'white',
                  }
                }
              }}
            >
              {tabs.map((tab, index) => (
                <Tab 
                  key={index}
                  icon={tab.icon}
                  label={tab.label}
                  iconPosition="start"
                />
              ))}
            </Tabs>
          </Box>

          {/* Overview Tab */}
          {activeTab === 0 && (
            <Box>
              {/* Stats Cards */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} lg={2}>
                  <StatCard
                    title="Active Shipments"
                    value={mockData.stats.activeShipments.value}
                    change={mockData.stats.activeShipments.change}
                    trend={mockData.stats.activeShipments.trend}
                    icon={LocalShipping}
                    color="primary"
                  />
                </Grid>
                <Grid item xs={12} sm={6} lg={2}>
                  <StatCard
                    title="Completed Today"
                    value={mockData.stats.completedToday.value}
                    change={mockData.stats.completedToday.change}
                    trend={mockData.stats.completedToday.trend}
                    icon={CheckCircle}
                    color="success"
                  />
                </Grid>
                <Grid item xs={12} sm={6} lg={2}>
                  <StatCard
                    title="Violations"
                    value={mockData.stats.violations.value}
                    change={mockData.stats.violations.change}
                    trend={mockData.stats.violations.trend}
                    icon={Warning}
                    color="error"
                  />
                </Grid>
                <Grid item xs={12} sm={6} lg={2}>
                  <StatCard
                    title="Revenue"
                    value={mockData.stats.revenue.value}
                    change={mockData.stats.revenue.change}
                    trend={mockData.stats.revenue.trend}
                    icon={TrendingUp}
                    color="info"
                  />
                </Grid>
                <Grid item xs={12} sm={6} lg={2}>
                  <StatCard
                    title="Efficiency"
                    value={mockData.stats.efficiency.value}
                    change={mockData.stats.efficiency.change}
                    trend={mockData.stats.efficiency.trend}
                    icon={Speed}
                    color="warning"
                  />
                </Grid>
                <Grid item xs={12} sm={6} lg={2}>
                  <StatCard
                    title="Pending Payments"
                    value={mockData.stats.pendingPayments.value}
                    change={mockData.stats.pendingPayments.change}
                    trend={mockData.stats.pendingPayments.trend}
                    icon={Payment}
                    color="primary"
                  />
                </Grid>
              </Grid>

              {/* Charts */}
              <Grid container spacing={3}>
                <Grid item xs={12} lg={8}>
                  <GlassCard sx={{ height: 400 }}>
                    <Typography variant="h6" gutterBottom fontWeight={700}>
                      Real-time Environmental Monitoring
                    </Typography>
                    <ResponsiveContainer width="100%" height="90%">
                      <AreaChart data={temperatureData}>
                        <defs>
                          <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#667eea" stopOpacity={0.1}/>
                          </linearGradient>
                          <linearGradient id="humidityGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#764ba2" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#764ba2" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.3)" />
                        <XAxis dataKey="time" stroke="rgba(255,255,255,0.7)" />
                        <YAxis yAxisId="temp" orientation="left" stroke="rgba(255,255,255,0.7)" />
                        <YAxis yAxisId="humidity" orientation="right" stroke="rgba(255,255,255,0.7)" />
                        <RechartsTooltip 
                          contentStyle={{ 
                            background: 'rgba(255,255,255,0.9)', 
                            border: 'none', 
                            borderRadius: '12px',
                            backdropFilter: 'blur(20px)'
                          }} 
                        />
                        <Legend />
                        <Area 
                          yAxisId="temp" 
                          type="monotone" 
                          dataKey="temp" 
                          stroke="#667eea" 
                          strokeWidth={3}
                          fill="url(#tempGradient)"
                          name="Temperature (°C)" 
                        />
                        <Line 
                          yAxisId="humidity" 
                          type="monotone" 
                          dataKey="humidity" 
                          stroke="#764ba2" 
                          strokeWidth={2}
                          name="Humidity (%)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </GlassCard>
                </Grid>
                <Grid item xs={12} lg={4}>
                  <GlassCard sx={{ height: 400 }}>
                    <Typography variant="h6" gutterBottom fontWeight={700}>
                      Violation Distribution
                    </Typography>
                    <ResponsiveContainer width="100%" height="90%">
                      <PieChart>
                        <Pie
                          data={violationData}
                          cx="50%"
                          cy="50%"
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {violationData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ 
                            background: 'rgba(255,255,255,0.9)', 
                            border: 'none', 
                            borderRadius: '12px' 
                          }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </GlassCard>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Live Tracking Tab */}
          {activeTab === 1 && (
            <Box>
              <Typography variant="h4" gutterBottom fontWeight={700} color="white" sx={{ mb: 3 }}>
                Live Shipment Tracking
              </Typography>
              <Grid container spacing={3}>
                {mockData.shipments.map((shipment, index) => (
                  <Grid item xs={12} md={6} lg={4} key={shipment.id}>
                    <ShipmentCard shipment={shipment} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Payments Tab */}
          {activeTab === 2 && (
            <Box>
              <Typography variant="h4" gutterBottom fontWeight={700} color="white" sx={{ mb: 3 }}>
                Payments & Invoices
              </Typography>
              <Grid container spacing={3}>
                {mockData.invoices.map((invoice, index) => (
                  <Grid item xs={12} md={6} lg={4} key={invoice.invoiceId}>
                    <InvoiceCard invoice={invoice} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Analytics Tab */}
          {activeTab === 3 && (
            <Box>
              <Typography variant="h4" gutterBottom fontWeight={700} color="white" sx={{ mb: 3 }}>
                Advanced Analytics
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <GlassCard sx={{ p: 4 }}>
                    <Typography variant="h5" gutterBottom fontWeight={700}>
                      Performance Metrics Dashboard
                    </Typography>
                    <Typography variant="body1" color="textSecondary">
                      Advanced analytics coming soon with AI-powered insights and predictive modeling.
                    </Typography>
                  </GlassCard>
                </Grid>
              </Grid>
            </Box>
          )}
        </Container>

        {/* Floating Action Button */}
        <Fab 
          color="primary" 
          sx={{ 
            position: 'fixed', 
            bottom: 32, 
            right: 32,
            background: 'linear-gradient(45deg, #667eea, #764ba2)',
            '&:hover': {
              background: 'linear-gradient(45deg, #5a6fd8, #6a4190)',
            }
          }}
        >
          <Add />
        </Fab>
      </Box>
    </ThemeProvider>
  );
};

export default PremiumDashboard;