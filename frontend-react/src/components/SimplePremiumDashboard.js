import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import {
  Box, Container, Typography, Card, CardContent, Grid, Paper, 
  Tabs, Tab, Button, Chip, Avatar, LinearProgress, CircularProgress,
  AppBar, Toolbar, IconButton, Badge, Stack, Alert, Fade, Grow, Slide
} from '@mui/material';
import {
  Dashboard, LocalShipping, Payment, Analytics, Notifications,
  TrendingUp, Warning, CheckCircle, Schedule, LocationOn,
  Thermostat, Speed, Security, AccountBalanceWallet,
  Refresh, Settings, MoreVert, Add
} from '@mui/icons-material';
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

const PremiumDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [paymentProcessing, setPaymentProcessing] = useState({});

  // Mock data
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

  const StatCard = ({ title, value, change, trend, icon: Icon, gradientColors }) => (
    <Grow in timeout={600}>
      <Card 
        sx={{ 
          background: `linear-gradient(135deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 100%)`,
          color: 'white',
          borderRadius: 4,
          p: 3,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
          }
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500, textTransform: 'uppercase' }}>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mt: 1, mb: 0.5 }}>
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
              height: 60
            }}
          >
            <Icon sx={{ fontSize: 30 }} />
          </Avatar>
        </Box>
      </Card>
    </Grow>
  );

  const ShipmentCard = ({ shipment }) => (
    <Fade in timeout={800}>
      <Card 
        sx={{ 
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 4,
          p: 3,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }
        }}
      >
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
            mb: 2,
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
            }
          }} 
        />

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6}>
            <Box display="flex" alignItems="center" p={1} bgcolor="rgba(25, 118, 210, 0.1)" borderRadius={2}>
              <Thermostat color="primary" sx={{ mr: 1 }} />
              <Box>
                <Typography variant="caption" color="textSecondary">Temperature</Typography>
                <Typography variant="body2" fontWeight={600}>{shipment.temperature}°C</Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box display="flex" alignItems="center" p={1} bgcolor="rgba(211, 47, 47, 0.1)" borderRadius={2}>
              <LocationOn color="error" sx={{ mr: 1 }} />
              <Box>
                <Typography variant="caption" color="textSecondary">Location</Typography>
                <Typography variant="body2" fontWeight={600}>{shipment.location}</Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center">
            <Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: 'primary.main' }}>
              {shipment.driver.split(' ').map(n => n[0]).join('')}
            </Avatar>
            <Typography variant="body2">{shipment.driver}</Typography>
          </Box>
          <Button 
            variant="contained" 
            size="small"
            sx={{ borderRadius: 3 }}
          >
            Track Live
          </Button>
        </Box>
      </Card>
    </Fade>
  );

  const InvoiceCard = ({ invoice }) => (
    <Slide direction="up" in timeout={600}>
      <Card 
        sx={{ 
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 4,
          p: 3,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }
        }}
      >
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
            sx={{ borderRadius: 3 }}
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
      </Card>
    </Slide>
  );

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative'
      }}
    >
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography 
            variant="h3" 
            component="h1" 
            sx={{ 
              fontWeight: 700, 
              color: 'white',
              mb: 1,
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}
          >
            Smart Freight Management
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              color: 'rgba(255,255,255,0.8)',
              fontWeight: 400
            }}
          >
            Real-time monitoring and analytics for your freight operations
          </Typography>
        </Box>

        {/* Tabs */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
          <Paper 
            sx={{ 
              background: 'rgba(255,255,255,0.1)', 
              backdropFilter: 'blur(20px)',
              borderRadius: 4,
              p: 1
            }}
          >
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{
                '& .MuiTabs-indicator': {
                  backgroundColor: 'white',
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
              <Tab icon={<Dashboard />} label="Overview" iconPosition="start" />
              <Tab icon={<LocalShipping />} label="Live Tracking" iconPosition="start" />
              <Tab icon={<Payment />} label="Payments" iconPosition="start" />
              <Tab icon={<Analytics />} label="Analytics" iconPosition="start" />
            </Tabs>
          </Paper>
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
                  gradientColors={['#667eea', '#764ba2']}
                />
              </Grid>
              <Grid item xs={12} sm={6} lg={2}>
                <StatCard
                  title="Completed Today"
                  value={mockData.stats.completedToday.value}
                  change={mockData.stats.completedToday.change}
                  trend={mockData.stats.completedToday.trend}
                  icon={CheckCircle}
                  gradientColors={['#56ab2f', '#a8e6cf']}
                />
              </Grid>
              <Grid item xs={12} sm={6} lg={2}>
                <StatCard
                  title="Violations"
                  value={mockData.stats.violations.value}
                  change={mockData.stats.violations.change}
                  trend={mockData.stats.violations.trend}
                  icon={Warning}
                  gradientColors={['#ff416c', '#ff4b2b']}
                />
              </Grid>
              <Grid item xs={12} sm={6} lg={2}>
                <StatCard
                  title="Revenue"
                  value={mockData.stats.revenue.value}
                  change={mockData.stats.revenue.change}
                  trend={mockData.stats.revenue.trend}
                  icon={TrendingUp}
                  gradientColors={['#74b9ff', '#0984e3']}
                />
              </Grid>
              <Grid item xs={12} sm={6} lg={2}>
                <StatCard
                  title="Efficiency"
                  value={mockData.stats.efficiency.value}
                  change={mockData.stats.efficiency.change}
                  trend={mockData.stats.efficiency.trend}
                  icon={Speed}
                  gradientColors={['#f7971e', '#ffd200']}
                />
              </Grid>
              <Grid item xs={12} sm={6} lg={2}>
                <StatCard
                  title="Pending Payments"
                  value={mockData.stats.pendingPayments.value}
                  change={mockData.stats.pendingPayments.change}
                  trend={mockData.stats.pendingPayments.trend}
                  icon={Payment}
                  gradientColors={['#a29bfe', '#6c5ce7']}
                />
              </Grid>
            </Grid>

            {/* Charts */}
            <Grid container spacing={3}>
              <Grid item xs={12} lg={8}>
                <Card sx={{ background: 'rgba(255,255,255,0.95)', borderRadius: 4, p: 3, height: 400 }}>
                  <Typography variant="h6" gutterBottom fontWeight={700}>
                    Real-time Environmental Monitoring
                  </Typography>
                  <ResponsiveContainer width="100%" height="85%">
                    <AreaChart data={temperatureData}>
                      <defs>
                        <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#667eea" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <RechartsTooltip 
                        contentStyle={{ 
                          background: 'rgba(255,255,255,0.95)', 
                          border: 'none', 
                          borderRadius: '12px',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                        }} 
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="temp" 
                        stroke="#667eea" 
                        strokeWidth={3}
                        fill="url(#tempGradient)"
                        name="Temperature (°C)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              </Grid>
              <Grid item xs={12} lg={4}>
                <Card sx={{ background: 'rgba(255,255,255,0.95)', borderRadius: 4, p: 3, height: 400 }}>
                  <Typography variant="h6" gutterBottom fontWeight={700}>
                    Violation Distribution
                  </Typography>
                  <ResponsiveContainer width="100%" height="85%">
                    <PieChart>
                      <Pie
                        data={violationData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {violationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Live Tracking Tab */}
        {activeTab === 1 && (
          <Box>
            <Typography variant="h4" gutterBottom fontWeight={700} color="white" sx={{ mb: 3, textAlign: 'center' }}>
              Live Shipment Tracking
            </Typography>
            <Grid container spacing={3}>
              {mockData.shipments.map((shipment) => (
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
            <Typography variant="h4" gutterBottom fontWeight={700} color="white" sx={{ mb: 3, textAlign: 'center' }}>
              Payments & Invoices
            </Typography>
            <Grid container spacing={3}>
              {mockData.invoices.map((invoice) => (
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
            <Typography variant="h4" gutterBottom fontWeight={700} color="white" sx={{ mb: 3, textAlign: 'center' }}>
              Advanced Analytics
            </Typography>
            <Card sx={{ background: 'rgba(255,255,255,0.95)', borderRadius: 4, p: 4, textAlign: 'center' }}>
              <Typography variant="h5" gutterBottom fontWeight={700}>
                Performance Metrics Dashboard
              </Typography>
              <Typography variant="body1" color="textSecondary">
                Advanced analytics with AI-powered insights and predictive modeling coming soon.
              </Typography>
            </Card>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default PremiumDashboard;