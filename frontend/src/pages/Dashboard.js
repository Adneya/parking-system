import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import '../pages/Dashboard.css';

const Dashboard = () => {
  const { user, getAnalytics, getLoyalty, getVehicles } = useContext(AuthContext);
  const [analytics, setAnalytics] = useState(null);
  const [loyalty, setLoyalty] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [analyticsData, loyaltyData, vehiclesData] = await Promise.all([
        getAnalytics(),
        getLoyalty(),
        getVehicles()
      ]);
      
      setAnalytics(analyticsData);
      setLoyalty(loyaltyData);
      setVehicles(vehiclesData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Welcome Section */}
      <div className="welcome-section">
        <h1>Welcome, {user?.firstName}!</h1>
        <p>Here's your parking activity overview</p>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🚗</div>
          <div className="stat-content">
            <h3>Total Vehicles</h3>
            <p className="stat-value">{analytics?.totalVehicles || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📍</div>
          <div className="stat-content">
            <h3>Parking Sessions</h3>
            <p className="stat-value">{analytics?.totalSessions || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <h3>Loyalty Points</h3>
            <p className="stat-value">{loyalty?.points || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💳</div>
          <div className="stat-content">
            <h3>Total Spent</h3>
            <p className="stat-value">${loyalty?.totalSpent?.toFixed(2) || '0.00'}</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Analytics Section */}
        <div className="dashboard-card">
          <h2>Your Statistics</h2>
          <div className="analytics-content">
            <div className="analytics-item">
              <span>Average Session Duration</span>
              <strong>{analytics?.averageSessionDuration || 0} min</strong>
            </div>
            <div className="analytics-item">
              <span>Member Since</span>
              <strong>{loyalty?.memberSince ? new Date(loyalty.memberSince).toLocaleDateString() : 'N/A'}</strong>
            </div>
            <div className="analytics-item">
              <span>Violations</span>
              <strong className="violation-count">{analytics?.violations || 0}</strong>
            </div>
          </div>
        </div>

        {/* Loyalty Program Section */}
        <div className="dashboard-card">
          <h2>Loyalty Program</h2>
          <div className="loyalty-content">
            <div className="tier-display">
              <span className="tier-label">Current Tier:</span>
              <span className={`tier-badge tier-${loyalty?.currentTier}`}>
                {loyalty?.currentTier?.toUpperCase()}
              </span>
            </div>
            <div className="discount-display">
              <span>Discount:</span>
              <strong>{loyalty?.discountPercentage || 0}%</strong>
            </div>
            <div className="points-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{width: `${Math.min((loyalty?.points || 0) / 1000 * 100, 100)}%`}}
                ></div>
              </div>
              <small>Next tier at {(loyalty?.points || 0) < 1500 ? 1500 - (loyalty?.points || 0) : 0} points</small>
            </div>
          </div>
        </div>

        {/* Vehicles Section */}
        <div className="dashboard-card vehicles-card">
          <h2>Your Vehicles</h2>
          {vehicles.length > 0 ? (
            <div className="vehicles-list">
              {vehicles.map((vehicle) => (
                <div key={vehicle._id} className="vehicle-item">
                  <div className="vehicle-icon">🚗</div>
                  <div className="vehicle-info">
                    <h4>{vehicle.make} {vehicle.model}</h4>
                    <p>{vehicle.licensePlate} • {vehicle.year}</p>
                  </div>
                  {vehicle.isPrimary && <span className="primary-badge">Primary</span>}
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No vehicles added yet</p>
          )}
        </div>

        {/* Recent Activity Section */}
        <div className="dashboard-card activity-card">
          <h2>Quick Actions</h2>
          <div className="quick-actions">
            <button className="action-button">
              <span>🚗</span> Add Vehicle
            </button>
            <button className="action-button">
              <span>💳</span> Payment Methods
            </button>
            <button className="action-button">
              <span>⚙️</span> Settings
            </button>
            <button className="action-button">
              <span>🔐</span> Security
            </button>
          </div>
        </div>
      </div>

      {/* Features Overview */}
      <div className="features-section">
        <h2>Why Choose Us?</h2>
        <div className="features-grid">
          <div className="feature">
            <div className="feature-icon">🎯</div>
            <h3>Smart Booking</h3>
            <p>Reserve parking spots in advance</p>
          </div>
          <div className="feature">
            <div className="feature-icon">💰</div>
            <h3>Earn Rewards</h3>
            <p>Get loyalty points with every booking</p>
          </div>
          <div className="feature">
            <div className="feature-icon">📊</div>
            <h3>Track History</h3>
            <p>View detailed parking analytics</p>
          </div>
          <div className="feature">
            <div className="feature-icon">🔔</div>
            <h3>Real-time Updates</h3>
            <p>Get instant notifications</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
