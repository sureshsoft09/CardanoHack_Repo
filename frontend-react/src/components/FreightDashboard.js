import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import '../styles/dashboard.css';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  Truck, Package, AlertTriangle, DollarSign, TrendingUp, MapPin,
  Clock, CheckCircle, XCircle, Eye, CreditCard, Thermometer,
  Navigation, Shield, Zap, BarChart3 as BarChartIcon
} from 'lucide-react';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3002';
const TRACKING_API = process.env.REACT_APP_TRACKING_API || 'http://localhost:3001';

const FreightDashboard = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [activeTab, setActiveTab] = useState('overview');
  const [paymentProcessing, setPaymentProcessing] = useState({});

  // Payment handler
  const handlePayInvoice = async (invoice) => {
    setPaymentProcessing(prev => ({ ...prev, [invoice.invoiceId]: true }));
    
    try {
      // Import wallet service dynamically
      const { default: WalletService } = await import('../services/wallet.js');
      const walletService = new WalletService();
      
      // Create payment invoice
      const paymentInvoice = {
        invoiceId: invoice.invoiceId,
        amountAda: invoice.amount,
        recipientAddress: process.env.REACT_APP_SETTLEMENT_AGENT_ADDRESS || 'addr_test1qpqs7dt0u8uk34dvxg2wp2xpwqpuf9lm5x3m0pzxhqrsact25jc2ym6w5spxjlhmp9x0qj426c8pmnkvjqqdsxe2ds2jyk5l',
        description: `${invoice.type} - ${invoice.shipmentId}`,
        dueDate: invoice.dueDate
      };
      
      // Process payment
      const result = await walletService.processInvoicePayment(paymentInvoice);
      
      if (result.payment.txHash) {
        alert(`Payment successful! Transaction: ${result.payment.txHash}`);
        // You could update the invoice status here
      }
      
    } catch (error) {
      console.error('Payment failed:', error);
      alert(`Payment failed: ${error.message}`);
    } finally {
      setPaymentProcessing(prev => ({ ...prev, [invoice.invoiceId]: false }));
    }
  };

  // Fetch tracking data
  const { data: trackingData, isLoading: trackingLoading } = useQuery(
    ['trackingData', selectedTimeRange],
    () => axios.get(`${TRACKING_API}/api/tracking/dashboard/${selectedTimeRange}`).then(res => res.data),
    { refetchInterval: 5000, enabled: false } // Mock data for now
  );

  // Fetch payment data
  const { data: paymentData, isLoading: paymentLoading } = useQuery(
    ['paymentData'],
    () => axios.get(`${API_BASE_URL}/api/payments/dashboard`).then(res => res.data),
    { refetchInterval: 10000, enabled: false } // Mock data for now
  );

  // Mock data for demonstration
  const mockTrackingData = {
    totalShipments: 1247,
    activeShipments: 89,
    completedToday: 23,
    violations: 12,
    onTimeDelivery: 94.2,
    avgTemperature: 2.4,
    avgHumidity: 65.2,
    fuelEfficiency: 87.6,
    recentShipments: [
      {
        id: 'SHIP-001',
        route: 'New York → Boston',
        status: 'In Transit',
        temperature: 2.1,
        humidity: 64,
        location: 'Connecticut',
        eta: '2 hours',
        violations: 0,
        driver: 'John Smith'
      },
      {
        id: 'SHIP-002',
        route: 'Miami → Orlando',
        status: 'Delivered',
        temperature: 1.8,
        humidity: 68,
        location: 'Orlando, FL',
        eta: 'Delivered',
        violations: 1,
        driver: 'Maria Garcia'
      },
      {
        id: 'SHIP-003',
        route: 'Chicago → Detroit',
        status: 'Loading',
        temperature: 2.5,
        humidity: 62,
        location: 'Chicago, IL',
        eta: '4 hours',
        violations: 0,
        driver: 'Robert Johnson'
      }
    ]
  };

  const mockPaymentData = {
    totalPending: 8,
    totalAmount: 450,
    paidToday: 125,
    pendingInvoices: [
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
      },
      {
        invoiceId: 'INV-003',
        shipmentId: 'SHIP-005',
        amount: 15,
        type: 'Delay Penalty',
        status: 'pending',
        dueDate: '2025-12-01',
        severity: 'minor'
      }
    ]
  };

  // Chart data
  const temperatureData = [
    { time: '00:00', temp: 2.1, humidity: 65 },
    { time: '04:00', temp: 2.3, humidity: 63 },
    { time: '08:00', temp: 2.0, humidity: 67 },
    { time: '12:00', temp: 2.4, humidity: 64 },
    { time: '16:00', temp: 2.2, humidity: 66 },
    { time: '20:00', temp: 2.1, humidity: 65 },
  ];

  const violationData = [
    { name: 'Temperature', value: 45, color: '#ef4444' },
    { name: 'Route', value: 30, color: '#f97316' },
    { name: 'Time', value: 20, color: '#eab308' },
    { name: 'Other', value: 5, color: '#6b7280' }
  ];

  const deliveryData = [
    { month: 'Jan', onTime: 96, delayed: 4 },
    { month: 'Feb', onTime: 94, delayed: 6 },
    { month: 'Mar', onTime: 97, delayed: 3 },
    { month: 'Apr', onTime: 95, delayed: 5 },
    { month: 'May', onTime: 98, delayed: 2 },
    { month: 'Jun', onTime: 94, delayed: 6 }
  ];

  const StatCard = ({ icon: Icon, title, value, subtitle, trend, color = "blue" }) => {
    const colorMap = {
      blue: 'from-blue-500 to-blue-600',
      green: 'from-green-500 to-emerald-500',
      red: 'from-red-500 to-red-600',
      orange: 'from-orange-500 to-amber-500',
      purple: 'from-purple-500 to-indigo-500'
    };
    
    return (
      <div className="stat-card bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500 hover:shadow-xl transition-all duration-300 fade-in">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2 mb-1">{value}</p>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
          <div className={`p-4 rounded-2xl bg-gradient-to-r ${colorMap[color]} shadow-lg transform transition-transform hover:scale-110`}>
            <Icon className="h-7 w-7 text-white" />
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center p-3 bg-green-50 rounded-lg">
            <TrendingUp className="h-4 w-4 text-green-600 mr-2" />
            <span className="text-sm text-green-700 font-medium">{trend}</span>
          </div>
        )}
      </div>
    );
  };

  const ShipmentCard = ({ shipment }) => (
    <div className="shipment-card bg-white rounded-lg shadow-md p-4 border hover:shadow-lg transition-all duration-300">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-lg">{shipment.id}</h3>
          <p className="text-gray-600 text-sm">{shipment.route}</p>
          <div className="flex items-center mt-2">
            <div className={`status-indicator ${
              shipment.status === 'Delivered' ? 'delivered' :
              shipment.status === 'In Transit' ? 'active' :
              'loading'
            }`}></div>
            <span className="text-xs text-gray-500 ml-2">Live tracking active</span>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium shadow-sm ${
          shipment.status === 'Delivered' ? 'bg-green-100 text-green-800 border border-green-200' :
          shipment.status === 'In Transit' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
          'bg-yellow-100 text-yellow-800 border border-yellow-200'
        }`}>
          {shipment.status}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center p-2 bg-blue-50 rounded-lg">
          <Thermometer className="h-4 w-4 text-blue-600 mr-2" />
          <div>
            <p className="text-xs text-gray-500">Temperature</p>
            <p className="text-sm font-semibold text-blue-700">{shipment.temperature}°C</p>
          </div>
        </div>
        <div className="flex items-center p-2 bg-red-50 rounded-lg">
          <MapPin className="h-4 w-4 text-red-600 mr-2" />
          <div>
            <p className="text-xs text-gray-500">Location</p>
            <p className="text-sm font-semibold text-red-700">{shipment.location}</p>
          </div>
        </div>
        <div className="flex items-center p-2 bg-orange-50 rounded-lg">
          <Clock className="h-4 w-4 text-orange-600 mr-2" />
          <div>
            <p className="text-xs text-gray-500">ETA</p>
            <p className="text-sm font-semibold text-orange-700">{shipment.eta}</p>
          </div>
        </div>
        <div className="flex items-center p-2 bg-purple-50 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-purple-600 mr-2" />
          <div>
            <p className="text-xs text-gray-500">Violations</p>
            <p className="text-sm font-semibold text-purple-700">{shipment.violations}</p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2">
            {shipment.driver.split(' ').map(n => n[0]).join('')}
          </div>
          <span className="text-sm text-gray-600">{shipment.driver}</span>
        </div>
        <button className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg">
          Track Live
        </button>
      </div>
    </div>
  );

  const InvoiceCard = ({ invoice }) => (
    <div className={`invoice-card ${invoice.severity} bg-white rounded-lg shadow-md p-4 border hover:shadow-lg transition-all duration-300`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-lg">{invoice.invoiceId}</h3>
          <p className="text-gray-600">{invoice.shipmentId}</p>
          <div className="flex items-center mt-2">
            <div className={`status-indicator ${
              invoice.severity === 'critical' ? 'bg-red-500' :
              invoice.severity === 'major' ? 'bg-orange-500' :
              'bg-yellow-500'
            } pulse-animation`}></div>
            <span className="text-xs text-gray-500">Due: {invoice.dueDate}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-red-600 mb-1">{invoice.amount} ADA</p>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            invoice.severity === 'critical' ? 'bg-red-100 text-red-800' :
            invoice.severity === 'major' ? 'bg-orange-100 text-orange-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {invoice.severity.toUpperCase()}
          </span>
        </div>
      </div>
      
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-700 font-medium mb-1">{invoice.type}</p>
        <p className="text-xs text-gray-500">Violation detected in shipment monitoring</p>
      </div>
      
      <div className="flex gap-2">
        <button 
          onClick={() => handlePayInvoice(invoice)}
          disabled={paymentProcessing[invoice.invoiceId]}
          className={`flex-1 text-white px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center ${
            paymentProcessing[invoice.invoiceId] 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 transform hover:scale-105 shadow-lg hover:shadow-xl'
          }`}
        >
          {paymentProcessing[invoice.invoiceId] ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : (
            <CreditCard className="h-4 w-4 mr-1" />
          )}
          {paymentProcessing[invoice.invoiceId] ? 'Processing...' : 'Pay with Wallet'}
        </button>
        <button className="bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm hover:bg-gray-300 transition-colors">
          <Eye className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Smart Freight Management Dashboard</h1>
        <p className="text-gray-600">Real-time monitoring and analytics for your freight operations</p>
      </div>

      {/* Time Range Selector */}
      <div className="mb-6">
        <div className="flex space-x-2">
          {['1h', '6h', '24h', '7d', '30d'].map(range => (
            <button
              key={range}
              onClick={() => setSelectedTimeRange(range)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedTimeRange === range
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: TrendingUp },
            { id: 'tracking', name: 'Live Tracking', icon: Navigation },
            { id: 'payments', name: 'Payments & Invoices', icon: CreditCard },
            { id: 'analytics', name: 'Analytics', icon: BarChartIcon }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {React.createElement(tab.icon, { className: "h-5 w-5 mr-2" })}
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon={Truck}
              title="Active Shipments"
              value={mockTrackingData.activeShipments}
              subtitle="Currently in transit"
              trend="+12% from yesterday"
              color="blue"
            />
            <StatCard
              icon={Package}
              title="Completed Today"
              value={mockTrackingData.completedToday}
              subtitle="Successful deliveries"
              trend="+8% from yesterday"
              color="green"
            />
            <StatCard
              icon={AlertTriangle}
              title="Active Violations"
              value={mockTrackingData.violations}
              subtitle="Require attention"
              trend="-15% from yesterday"
              color="red"
            />
            <StatCard
              icon={DollarSign}
              title="Pending Payments"
              value={`${mockPaymentData.totalAmount} ADA`}
              subtitle={`${mockPaymentData.totalPending} invoices`}
              trend="$125 paid today"
              color="orange"
            />
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">On-Time Delivery Rate</h3>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">{mockTrackingData.onTimeDelivery}%</div>
                <p className="text-gray-500">Last 30 days</p>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Avg. Temperature</h3>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">{mockTrackingData.avgTemperature}°C</div>
                <p className="text-gray-500">Cold chain compliance</p>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Fuel Efficiency</h3>
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600 mb-2">{mockTrackingData.fuelEfficiency}%</div>
                <p className="text-gray-500">Fleet average</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Tracking Tab */}
      {activeTab === 'tracking' && (
        <div className="space-y-6">
          {/* Real-time Environmental Data */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Real-time Environmental Monitoring</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={temperatureData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis yAxisId="temp" orientation="left" />
                  <YAxis yAxisId="humidity" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="temp" type="monotone" dataKey="temp" stroke="#3b82f6" strokeWidth={2} name="Temperature (°C)" />
                  <Line yAxisId="humidity" type="monotone" dataKey="humidity" stroke="#10b981" strokeWidth={2} name="Humidity (%)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Active Shipments */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Active Shipments</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {mockTrackingData.recentShipments.map(shipment => (
                <ShipmentCard key={shipment.id} shipment={shipment} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* Payment Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Pending Invoices</h3>
              <p className="text-3xl font-bold text-red-600">{mockPaymentData.totalPending}</p>
              <p className="text-sm text-gray-500">Total Amount: {mockPaymentData.totalAmount} ADA</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Paid Today</h3>
              <p className="text-3xl font-bold text-green-600">{mockPaymentData.paidToday} ADA</p>
              <p className="text-sm text-gray-500">3 transactions completed</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Success Rate</h3>
              <p className="text-3xl font-bold text-blue-600">98.5%</p>
              <p className="text-sm text-gray-500">Payment processing</p>
            </div>
          </div>

          {/* Pending Invoices */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Pending Invoices</h3>
              <button className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors">
                Pay All Pending
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {mockPaymentData.pendingInvoices.map(invoice => (
                <InvoiceCard key={invoice.invoiceId} invoice={invoice} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Violation Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Violation Types Distribution</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={violationData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {violationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Delivery Performance Trend</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deliveryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="onTime" stackId="a" fill="#10b981" name="On Time" />
                    <Bar dataKey="delayed" stackId="a" fill="#ef4444" name="Delayed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Additional Analytics */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <Shield className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">99.2%</p>
                <p className="text-sm text-gray-500">Security Score</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Zap className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">1.2s</p>
                <p className="text-sm text-gray-500">Avg Response Time</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <TrendingUp className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-600">+23%</p>
                <p className="text-sm text-gray-500">Efficiency Gain</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-emerald-600">847</p>
                <p className="text-sm text-gray-500">Successful Deliveries</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FreightDashboard;