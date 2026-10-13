require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/parking-system', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ MongoDB connected successfully');
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// Connect to database
connectDB();

// Routes
app.use('/api/users',        require('./routes/userRoutes'));
app.use('/api/payments',     require('./routes/paymentRoutes'));
app.use('/api/parking',      require('./routes/parkingRoutes'));
app.use('/api/bookings',     require('./routes/bookingRoutes'));
app.use('/api/sensors',      require('./routes/sensorRoutes'));
app.use('/api/inspections',      require('./routes/inspectionRoutes'));
app.use('/api/rentals',          require('./routes/rentalRoutes'));
app.use('/api/rental-bookings',  require('./routes/rentalBookingRoutes'));
app.use('/api/maintenance',      require('./routes/maintenanceRoutes'));
app.use('/api/admin',        require('./routes/adminRoutes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Parking System API is running'
  });
});

// In the single-container deployment, Express serves the compiled React app.
// Keep this before the 404 handler so React Router routes resolve correctly.
if (process.env.SERVE_FRONTEND === 'true') {
  const frontendPath = path.join(__dirname, 'public');
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const DEFAULT_PORT = Number(process.env.PORT) || 5000;
let activeServer = null;

function printStartupBanner(port) {
  console.log(`
╔════════════════════════════════════════════════╗
║   Parking System API Server Started            ║
║   Port: ${port}                                       ║
║   Environment: ${process.env.NODE_ENV || 'development'}                 ║
║   API URL: http://localhost:${port}/api              ║
╚════════════════════════════════════════════════╝
  `);
}

function startServer(port, retriesLeft = 5) {
  activeServer = app
    .listen(port, () => {
      printStartupBanner(port);
    })
    .on('error', (error) => {
      if (error.code === 'EADDRINUSE' && retriesLeft > 0) {
        const nextPort = port + 1;
        console.warn(`Port ${port} is busy. Retrying on port ${nextPort}...`);
        return startServer(nextPort, retriesLeft - 1);
      }
      console.error('Failed to start API server:', error.message);
      process.exit(1);
    });
}

startServer(DEFAULT_PORT);

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n✓ Shutting down gracefully...');
  if (activeServer) {
    await new Promise((resolve) => activeServer.close(resolve));
  }
  await mongoose.disconnect();
  process.exit(0);
});

module.exports = app;
