import React, { useState, useEffect } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import './GradientDashboard.css';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const GradientDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [paymentProcessing, setPaymentProcessing] = useState({});
  const [selectedShipment, setSelectedShipment] = useState(null);

  // Custom truck icon for in-transit shipments
  const truckIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="1" y="3" width="15" height="13" rx="2" fill="#667eea" stroke="white" stroke-width="1.5"/>
        <path d="M16 8h3l3 3v5h-4" fill="#667eea" stroke="white" stroke-width="1.5"/>
        <circle cx="5.5" cy="18.5" r="2.5" fill="#333" stroke="white" stroke-width="1"/>
        <circle cx="18.5" cy="18.5" r="2.5" fill="#333" stroke="white" stroke-width="1"/>
      </svg>
    `),
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });

  // Warehouse icon for origin/destination
  const warehouseIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
        <path d="M12 2L2 7v15h20V7L12 2z" fill="#10b981" stroke="white" stroke-width="1.5"/>
        <rect x="9" y="10" width="6" height="12" fill="white" opacity="0.3"/>
        <rect x="9" y="10" width="2" height="3" fill="white"/>
        <rect x="13" y="10" width="2" height="3" fill="white"/>
        <rect x="9" y="15" width="2" height="3" fill="white"/>
        <rect x="13" y="15" width="2" height="3" fill="white"/>
      </svg>
    `),
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  // Completed delivery icon
  const completedIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="#10b981" stroke="white" stroke-width="2"/>
        <path d="M7 12l3 3 7-7" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `),
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });

  // Loading icon
  const loadingIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="#f97316" stroke="white" stroke-width="2"/>
        <path d="M12 6v6l4 4" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
      </svg>
    `),
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });

  // Get appropriate icon based on shipment status
  const getShipmentIcon = (status) => {
    switch(status) {
      case 'In Transit': return truckIcon;
      case 'Delivered': return completedIcon;
      case 'Loading': return loadingIcon;
      default: return truckIcon;
    }
  };

  // Mock data
  const mockData = {
    stats: [
      { title: 'Active Shipments', value: 89, change: '+12%', icon: '🚚', gradient: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', textColor: '#fff' },
      { title: 'Completed Today', value: 23, change: '+8%', icon: '✅', gradient: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)', textColor: '#fff' },
      { title: 'Violations', value: 12, change: '-15%', icon: '⚠️', gradient: 'linear-gradient(135deg, #991b1b 0%, #ef4444 100%)', textColor: '#fff' },
      { title: 'Revenue', value: '$125,430', change: '+18%', icon: '💵', gradient: 'linear-gradient(135deg, #065f46 0%, #34d399 100%)', textColor: '#fff' },
      { title: 'Efficiency', value: '94.2%', change: '+3%', icon: '⚡', gradient: 'linear-gradient(135deg, #ea580c 0%, #fb923c 100%)', textColor: '#fff' },
      { title: 'Pending Payments', value: '450 ADA', change: '+5%', icon: '💰', gradient: 'linear-gradient(135deg, #7c2d12 0%, #f97316 100%)', textColor: '#fff' },
    ],
    analytics: [
      { title: 'Total Distance', value: '45,230 km', icon: '🛣️', gradient: 'linear-gradient(135deg, #4c1d95 0%, #8b5cf6 100%)', change: '+22%' },
      { title: 'Fuel Efficiency', value: '8.5 L/100km', icon: '⛽', gradient: 'linear-gradient(135deg, #065f46 0%, #14b8a6 100%)', change: '-5%' },
      { title: 'On-Time Delivery', value: '96.8%', icon: '⏰', gradient: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', change: '+4%' },
      { title: 'Customer Rating', value: '4.8/5.0', icon: '⭐', gradient: 'linear-gradient(135deg, #b91c1c 0%, #f59e0b 100%)', change: '+0.3' },
      { title: 'Carbon Footprint', value: '2.3 tons', icon: '🌱', gradient: 'linear-gradient(135deg, #15803d 0%, #84cc16 100%)', change: '-12%' },
      { title: 'Active Drivers', value: '156', icon: '👥', gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)', change: '+8%' },
    ],
    shipments: [
      {
        id: 'SHIP-001',
        route: 'New York → Boston',
        status: 'In Transit',
        progress: 75,
        temperature: 2.1,
        location: 'Connecticut',
        coordinates: { lat: 41.6032, lng: -73.0877 }, // Connecticut
        origin: { lat: 40.7128, lng: -74.0060, name: 'New York' },
        destination: { lat: 42.3601, lng: -71.0589, name: 'Boston' },
        eta: '2 hours',
        driver: 'John Smith',
        statusColor: '#667eea'
      },
      {
        id: 'SHIP-002',
        route: 'Miami → Orlando',
        status: 'Delivered',
        progress: 100,
        temperature: 1.8,
        location: 'Orlando, FL',
        coordinates: { lat: 28.5383, lng: -81.3792 }, // Orlando
        origin: { lat: 25.7617, lng: -80.1918, name: 'Miami' },
        destination: { lat: 28.5383, lng: -81.3792, name: 'Orlando' },
        eta: 'Delivered',
        driver: 'Maria Garcia',
        statusColor: '#56ab2f'
      },
      {
        id: 'SHIP-003',
        route: 'Chicago → Detroit',
        status: 'Loading',
        progress: 15,
        temperature: 2.5,
        location: 'Chicago, IL',
        coordinates: { lat: 41.8781, lng: -87.6298 }, // Chicago
        origin: { lat: 41.8781, lng: -87.6298, name: 'Chicago' },
        destination: { lat: 42.3314, lng: -83.0458, name: 'Detroit' },
        eta: '4 hours',
        driver: 'Robert Johnson',
        statusColor: '#f7971e'
      }
    ],
    invoices: [
      {
        invoiceId: 'INV-001',
        shipmentId: 'SHIP-001',
        amount: 25,
        type: 'Temperature Violation',
        status: 'pending',
        severity: 'critical'
      },
      {
        invoiceId: 'INV-002',
        shipmentId: 'SHIP-002',
        amount: 50,
        type: 'Route Deviation',
        status: 'pending',
        severity: 'major'
      }
    ]
  };

  const temperatureData = {
    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
    datasets: [
      {
        label: 'Temperature (°C)',
        data: [2.1, 2.3, 2.0, 2.4, 2.2, 2.1],
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.2)',
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 4,
        pointBackgroundColor: '#667eea',
      }
    ]
  };

  const violationData = {
    labels: ['Temperature', 'Route', 'Time', 'Other'],
    datasets: [
      {
        data: [45, 30, 20, 5],
        backgroundColor: ['#ff416c', '#f7971e', '#74b9ff', '#a29bfe'],
        borderWidth: 0,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#333',
        bodyColor: '#666',
        borderColor: '#ddd',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        }
      },
      x: {
        grid: {
          display: false,
        }
      }
    }
  };

  const handlePayInvoice = async (invoice) => {
    setPaymentProcessing(prev => ({ ...prev, [invoice.invoiceId]: true }));
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create custom success popup
      const popup = document.createElement('div');
      popup.className = 'payment-success-popup';
      popup.innerHTML = `
        <div class="popup-content">
          <div class="success-icon">✓</div>
          <h2>Payment Successful!</h2>
          <div class="payment-details">
            <div class="detail-row">
              <span class="label">Invoice ID:</span>
              <span class="value">${invoice.invoiceId}</span>
            </div>
            <div class="detail-row">
              <span class="label">Shipment:</span>
              <span class="value">${invoice.shipmentId}</span>
            </div>
            <div class="detail-row">
              <span class="label">Amount Paid:</span>
              <span class="value highlight">${invoice.amount} ADA</span>
            </div>
            <div class="detail-row">
              <span class="label">Violation Type:</span>
              <span class="value">${invoice.type}</span>
            </div>
            <div class="detail-row">
              <span class="label">Transaction Status:</span>
              <span class="value success">Confirmed on Cardano Blockchain</span>
            </div>
          </div>
          <button class="popup-close-btn" onclick="this.parentElement.parentElement.remove()">
            Close
          </button>
        </div>
      `;
      document.body.appendChild(popup);
      
      // Auto-remove after 8 seconds
      setTimeout(() => {
        if (popup.parentElement) {
          popup.remove();
        }
      }, 8000);
    } catch (error) {
      console.error('Payment failed:', error);
      
      // Create error popup
      const errorPopup = document.createElement('div');
      errorPopup.className = 'payment-error-popup';
      errorPopup.innerHTML = `
        <div class="popup-content">
          <div class="error-icon">✗</div>
          <h2>Payment Failed</h2>
          <p class="error-message">Unable to process payment. Please try again.</p>
          <button class="popup-close-btn" onclick="this.parentElement.parentElement.remove()">
            Close
          </button>
        </div>
      `;
      document.body.appendChild(errorPopup);
      
      setTimeout(() => {
        if (errorPopup.parentElement) {
          errorPopup.remove();
        }
      }, 5000);
    } finally {
      setPaymentProcessing(prev => ({ ...prev, [invoice.invoiceId]: false }));
    }
  };

  return (
    <div className="gradient-dashboard">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <h1 className="dashboard-title">Smart Freight Management</h1>
          <p className="dashboard-subtitle">Real-time monitoring and analytics for your freight operations</p>
        </div>

        {/* Navigation Tabs */}
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 0 ? 'active' : ''}`}
            onClick={() => setActiveTab(0)}
          >
            <span className="tab-icon">📊</span>
            Overview
          </button>
          <button 
            className={`tab-button ${activeTab === 1 ? 'active' : ''}`}
            onClick={() => setActiveTab(1)}
          >
            <span className="tab-icon">🚚</span>
            Live Tracking
          </button>
          <button 
            className={`tab-button ${activeTab === 2 ? 'active' : ''}`}
            onClick={() => setActiveTab(2)}
          >
            <span className="tab-icon">💳</span>
            Payments
          </button>
          <button 
            className={`tab-button ${activeTab === 3 ? 'active' : ''}`}
            onClick={() => setActiveTab(3)}
          >
            <span className="tab-icon">📈</span>
            Analytics
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 0 && (
          <div className="tab-content">
            {/* Stats Cards */}
            <div className="stats-grid">
              {mockData.stats.map((stat, index) => (
                <div key={index} className="stat-card high-contrast" style={{ background: stat.gradient }}>
                  <div className="stat-content">
                    <div className="stat-info">
                      <p className="stat-label">{stat.title}</p>
                      <h3 className="stat-value">{stat.value}</h3>
                      <p className="stat-change">
                        <span className="change-indicator">{stat.change.startsWith('+') ? '▲' : '▼'}</span>
                        {stat.change}
                      </p>
                    </div>
                    <div className="stat-icon">{stat.icon}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Grid */}
            <div className="charts-grid">
              <div className="chart-card large-chart">
                <h3 className="chart-title">Real-time Environmental Monitoring</h3>
                <div style={{ height: '350px' }}>
                  <Line data={temperatureData} options={chartOptions} />
                </div>
              </div>

              <div className="chart-card">
                <h3 className="chart-title">Violation Distribution</h3>
                <div style={{ height: '350px' }}>
                  <Doughnut data={violationData} options={{ 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                      }
                    }
                  }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Tracking Tab */}
        {activeTab === 1 && (
          <div className="tab-content">
            <h2 className="section-title">Live Shipment Tracking</h2>
            
            {/* Interactive Map */}
            <div className="map-container" style={{ marginBottom: '2rem' }}>
              <MapContainer 
                center={[39.8283, -98.5795]} 
                zoom={4} 
                style={{ height: '500px', borderRadius: '24px', overflow: 'hidden' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {mockData.shipments.map((shipment) => (
                  <React.Fragment key={shipment.id}>
                    {/* Current location marker with custom icon */}
                    <Marker 
                      position={[shipment.coordinates.lat, shipment.coordinates.lng]}
                      icon={getShipmentIcon(shipment.status)}
                    >
                      <Popup>
                        <div style={{ minWidth: '200px' }}>
                          <h3 style={{ margin: '0 0 8px 0', color: shipment.statusColor, fontSize: '16px', fontWeight: '700' }}>
                            {shipment.id}
                          </h3>
                          <p style={{ margin: '4px 0', fontSize: '14px' }}><strong>Status:</strong> {shipment.status}</p>
                          <p style={{ margin: '4px 0', fontSize: '14px' }}><strong>Location:</strong> {shipment.location}</p>
                          <p style={{ margin: '4px 0', fontSize: '14px' }}><strong>Temperature:</strong> {shipment.temperature}°C</p>
                          <p style={{ margin: '4px 0', fontSize: '14px' }}><strong>Driver:</strong> {shipment.driver}</p>
                          <p style={{ margin: '4px 0', fontSize: '14px' }}><strong>Progress:</strong> {shipment.progress}%</p>
                          <p style={{ margin: '4px 0', fontSize: '14px' }}><strong>ETA:</strong> {shipment.eta}</p>
                        </div>
                      </Popup>
                    </Marker>
                    
                    {/* Route line from origin to destination */}
                    <Polyline 
                      positions={[
                        [shipment.origin.lat, shipment.origin.lng],
                        [shipment.coordinates.lat, shipment.coordinates.lng],
                        [shipment.destination.lat, shipment.destination.lng]
                      ]}
                      color={shipment.statusColor}
                      weight={selectedShipment === shipment.id ? 5 : 3}
                      opacity={selectedShipment === shipment.id ? 1 : 0.7}
                      dashArray={shipment.status === 'Delivered' ? '0' : '10, 10'}
                    />
                    
                    {/* Origin marker */}
                    <Marker 
                      position={[shipment.origin.lat, shipment.origin.lng]}
                      icon={warehouseIcon}
                      opacity={selectedShipment === null || selectedShipment === shipment.id ? 1 : 0.4}
                    >
                      <Popup>
                        <div style={{ minWidth: '150px' }}>
                          <h4 style={{ margin: '0 0 8px 0', color: '#10b981' }}>📦 Origin</h4>
                          <p style={{ margin: '4px 0', fontSize: '14px' }}><strong>{shipment.origin.name}</strong></p>
                          <p style={{ margin: '4px 0', fontSize: '12px', color: '#666' }}>Shipment: {shipment.id}</p>
                        </div>
                      </Popup>
                    </Marker>
                    
                    {/* Destination marker */}
                    <Marker 
                      position={[shipment.destination.lat, shipment.destination.lng]}
                      icon={warehouseIcon}
                      opacity={selectedShipment === null || selectedShipment === shipment.id ? 1 : 0.4}
                    >
                      <Popup>
                        <div style={{ minWidth: '150px' }}>
                          <h4 style={{ margin: '0 0 8px 0', color: '#10b981' }}>🎯 Destination</h4>
                          <p style={{ margin: '4px 0', fontSize: '14px' }}><strong>{shipment.destination.name}</strong></p>
                          <p style={{ margin: '4px 0', fontSize: '12px', color: '#666' }}>Shipment: {shipment.id}</p>
                        </div>
                      </Popup>
                    </Marker>
                  </React.Fragment>
                ))}
              </MapContainer>
            </div>
            
            {/* Shipment Cards */}
            <div className="shipments-grid">
              {mockData.shipments.map((shipment) => (
                <div 
                  key={shipment.id} 
                  className={`shipment-card ${selectedShipment === shipment.id ? 'selected' : ''}`}
                  onClick={() => setSelectedShipment(selectedShipment === shipment.id ? null : shipment.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="shipment-header">
                    <div>
                      <h3 className="shipment-id">{shipment.id}</h3>
                      <p className="shipment-route">{shipment.route}</p>
                    </div>
                    <span className="status-badge" style={{ backgroundColor: shipment.statusColor }}>
                      {shipment.status}
                    </span>
                  </div>

                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${shipment.progress}%` }}></div>
                  </div>

                  <div className="shipment-details">
                    <div className="detail-box">
                      <span className="detail-icon">🌡️</span>
                      <div>
                        <p className="detail-label">Temperature</p>
                        <p className="detail-value">{shipment.temperature}°C</p>
                      </div>
                    </div>
                    <div className="detail-box">
                      <span className="detail-icon">📍</span>
                      <div>
                        <p className="detail-label">Location</p>
                        <p className="detail-value">{shipment.location}</p>
                      </div>
                    </div>
                  </div>

                  <div className="shipment-footer">
                    <div className="driver-info">
                      <div className="driver-avatar">
                        {shipment.driver.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span>{shipment.driver}</span>
                    </div>
                    <button className="track-button">Track Live</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 2 && (
          <div className="tab-content">
            <h2 className="section-title">Payments & Invoices</h2>
            <div className="invoices-grid">
              {mockData.invoices.map((invoice) => (
                <div key={invoice.invoiceId} className="invoice-card">
                  <div className="invoice-header">
                    <div>
                      <h3 className="invoice-id">{invoice.invoiceId}</h3>
                      <p className="invoice-shipment">{invoice.shipmentId}</p>
                    </div>
                    <div className="invoice-amount-section">
                      <h4 className="invoice-amount">{invoice.amount} ADA</h4>
                      <span className={`severity-badge ${invoice.severity}`}>
                        {invoice.severity.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className={`alert-box ${invoice.severity}`}>
                    {invoice.type}
                  </div>

                  <button 
                    className="pay-button"
                    disabled={paymentProcessing[invoice.invoiceId]}
                    onClick={() => handlePayInvoice(invoice)}
                  >
                    {paymentProcessing[invoice.invoiceId] ? (
                      <>
                        <span className="spinner"></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <span>💰</span>
                        Pay with Wallet
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 3 && (
          <div className="tab-content">
            <h2 className="section-title">Advanced Analytics</h2>
            <div className="stats-grid">
              {mockData.analytics.map((stat, index) => (
                <div key={index} className="stat-card high-contrast" style={{ background: stat.gradient }}>
                  <div className="stat-content">
                    <div className="stat-info">
                      <p className="stat-label">{stat.title}</p>
                      <h3 className="stat-value">{stat.value}</h3>
                      <p className="stat-change">
                        <span className="change-indicator">{stat.change.startsWith('+') ? '▲' : '▼'}</span>
                        {stat.change}
                      </p>
                    </div>
                    <div className="stat-icon">{stat.icon}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="analytics-summary">
              <h3 className="analytics-summary-title">📊 Performance Insights</h3>
              <div className="insight-cards">
                <div className="insight-card">
                  <div className="insight-icon">🎯</div>
                  <h4>Delivery Performance</h4>
                  <p>Your on-time delivery rate is <strong>96.8%</strong>, exceeding the industry average by 8.3%</p>
                </div>
                <div className="insight-card">
                  <div className="insight-icon">💡</div>
                  <h4>Efficiency Recommendation</h4>
                  <p>Route optimization could save <strong>$12,450/month</strong> in fuel costs</p>
                </div>
                <div className="insight-card">
                  <div className="insight-icon">🌟</div>
                  <h4>Customer Satisfaction</h4>
                  <p>Customer rating improved by <strong>0.3 points</strong> this quarter</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GradientDashboard;