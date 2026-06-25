# Parking System - Architecture Documentation

## System Overview

The Parking System is a comprehensive platform for car rental bookings, parking spot management, and payment integration. It features a modern React+Vite frontend with a scalable Express.js backend powered by MongoDB.

**Technologies:**
- **Frontend:** React 18.2, Vite 4.5, Tailwind CSS 3.3, Framer Motion 10.16, React Router 6.8, Axios
- **Backend:** Express 4.18, MongoDB 7.0 (Mongoose), JWT, Stripe, Nodemailer, QR Code
- **Architecture Pattern:** MVC (Backend), Component-Based (Frontend)

---

## System Architecture Layers

### 1. **Presentation Layer (Frontend)**
Modern React application with responsive design and smooth animations.

**Components:**
- `Login.jsx` - Authentication entry point
- `Register.jsx` - User account creation
- `Dashboard.jsx` - Main user hub
- `Rentals.jsx` - Browse available rentals
- `PreBooking.jsx` - Pre-booking features
- `Payment.jsx` - Payment processing interface
- `MyRentalBookings.jsx` - User booking history
- `LiveMap.jsx` - Interactive parking spot map
- `AdminPanel.jsx` - Administrative controls
- `Maintenance.jsx` - Maintenance management
- `Inspection.jsx` - Vehicle inspection interface

**Services:**
- `api.js` - Axios-based API client with Vite environment variables
- `AuthContext.jsx` - Global authentication state management

### 2. **Business Logic Layer (Controllers)**
Express.js controllers implementing business operations.

**10 Core Controllers:**
- `userController.js` - User authentication & profile management
- `rentalController.js` - Rental CRUD operations
- `rentalBookingController.js` - Car rental booking logic
- `parkingController.js` - Parking spot management
- `bookingController.js` - Parking spot bookings
- `paymentController.js` - Payment processing & integration
- `maintenanceController.js` - Maintenance workflows
- `adminController.js` - Admin operations
- `inspectionController.js` - Vehicle inspection handling
- `sensorController.js` - IoT sensor data processing

### 3. **Data Access Layer (Models)**
MongoDB schemas defining domain entities and relationships.

**9 Core Domain Models:**
- `User` - User profiles, authentication, and preferences
- `Vehicle` - Vehicle inventory (embedded in User)
- `ParkingSpot` - Parking locations (225 seeded across 11 Indian cities)
- `Rental` - Vehicle rental listings
- `RentalBooking` - Car rental transactions
- `Booking` - Parking spot reservations
- `VehicleInspection` - Vehicle condition & damage reports
- `MaintenanceAlert` - Spot maintenance tracking
- `ParkingSession` - Active parking sessions
- `SpotSensor` - IoT sensor integration

---

## Component Class Diagram

The following diagram illustrates the static structure and relationships between all system components:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PARKING SYSTEM - CLASS DIAGRAM                           │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ User                                                                 │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ + _id: ObjectId                                                      │   │
│  │ + email: String                                                      │   │
│  │ + password: String                                                   │   │
│  │ + role: String (user/admin/host)                                    │   │
│  │ + firstName: String                                                  │   │
│  │ + lastName: String                                                   │   │
│  │ + phone: String                                                      │   │
│  │ + vehicles: Vehicle[]                                                │   │
│  │ + licenseNumber: String                                              │   │
│  │ + parkingBehavior: ParkingBehavior                                   │   │
│  │ + emailVerified: Boolean                                             │   │
│  │ + createdAt: Date                                                    │   │
│  └────────────────────────────────┬─────────────────────────────────────┘   │
│                                    │                                         │
│         ┌──────────────────────────┼──────────────────────────────────┐     │
│         │                          │                                  │     │
│    1 --> * ┌──────────────────────────────────┐    1 --> * ┌──────────────────────┐
│         │  │ Vehicle                          │    │    │  │ Rental             │
│         │  ├──────────────────────────────────┤    │    │  ├──────────────────────┤
│         │  │ + licensePlate: String           │    │    │  │ + _id: ObjectId    │
│         │  │ + make: String                   │    │    │  │ + host: ObjectId   │
│         │  │ + model: String                  │    │    │  │ + spot: ObjectId   │
│         │  │ + year: Number                   │    │    │  │ + title: String    │
│         │  │ + type: String                   │    │    │  │ + dailyRate: Number│
│         │  │ + seats: Number                  │    │    │  │ + status: String   │
│         │  │ + features: String[]             │    │    │  │ + vehicle: Object  │
│         │  └──────────────────────────────────┘    │    │  └────────────────────┘
│         │                                          │    │           │
│         │                                          │    │      1 --> * ┌── RentalBooking
│         │                                          │    │           │
│    1 --> * ┌──────────────────────────────────┐    │    │  ┌────────────────────┐
│         │  │ RentalBooking                    │    │    │  │ + renter: ObjectId │
│         │  ├──────────────────────────────────┤    │    │  │ + rental: ObjectId │
│         │  │ + startDate: Date                │    │    │  │ +total Amount: Num │
│         │  │ + endDate: Date                  │    │    │  │ + status: String   │
│         │  │ + totalAmount: Number            │    │    │  │ + isPaid: Boolean  │
│         │  │ + paymentStatus: String          │    │    │  └────────────────────┘
│         │  │ + status: String                 │    │    │
│         │  └──────────────────────────────────┘    │    │
│         │                                          │    │
│    1 --> * ┌──────────────────────────────────┐    │    │
│         │  │ Booking                          │    │    │
│         │  ├──────────────────────────────────┤    │    │
│         │  │ + user: ObjectId                 │    │    │
│         │  │ + spot: ObjectId                 │    │    │
│         │  │ + scheduledStart: Date           │    │    │
│         │  │ + scheduledEnd: Date             │    │    │
│         │  │ + status: String                 │    │    │
│         │  │ + isPaid: Boolean                │    │    │
│         │  └────────────────────┬─────────────┘    │    │
│         │                       │                  │    │
│         │                  1 --> * ┌──────────────────────────────────┐
│         │                       │  │ VehicleInspection              │
│         │                       │  ├──────────────────────────────────┤
│         │                       │  │ + booking: ObjectId            │
│         │                       │  │ + licensePlate: String         │
│         │                       │  │ + damageDetected: Boolean      │
│         │                       │  │ + damageReports: Object[]      │
│         │                       │  │ + inspectionType: String       │
│         │                       │  │ + autoApproved: Boolean        │
│         │                       │  └──────────────────────────────────┘
│         │                       │
│    1 --> * ┌──────────────────────────────────┐
│         │  │ VehicleInspection                │
│         │  └──────────────────────────────────┘
│         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  ParkingSpot                        MaintenanceAlert      ParkingSession    │
├─────────────────────────────────────────────────────────────────────────────┤
│  + _id: ObjectId                   + _id: ObjectId      + _id: ObjectId    │
│  + name: String                    + spot: ObjectId     + user: ObjectId   │
│  + city: String                    + severity: String   + spot: ObjectId   │
│  + totalSpots: Number              + status: String     + booking: ObjectId│
│  + availableSpots: Number          + reportedDate: Date + status: String   │
│  + hourlyRate: Number                                   + checkInTime: Date│
│  + dailyRate: Number                                    + actualCheckOut   │
│  + rating: Number                                                          │
│  + amenities: String[]             SpotSensor                              │
│  + operatingHours: Object          + _id: ObjectId                         │
│  + location: GeoLocation           + spot: ObjectId                        │
│                                    + sensorId: String                      │
│                                    + occupancyStatus: Number               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Relationships:

1. **User Relationships:**
   - 1 User → Many Vehicles (owns)
   - 1 User → Many Rentals (hosts)
   - 1 User → Many RentalBookings (makes)
   - 1 User → Many Bookings (makes)
   - 1 User → Many VehicleInspections (receives)

2. **ParkingSpot Relationships:**
   - 1 ParkingSpot → Many Rentals (has_for_rent)
   - 1 ParkingSpot → Many Bookings (has_bookings)
   - 1 ParkingSpot → Many MaintenanceAlerts (tracked_by)
   - 1 ParkingSpot → 0/1 SpotSensor (monitored_by)

3. **Rental Relationships:**
   - 1 Rental → Many RentalBookings (receives)
   - 1 Rental → Many VehicleInspections (subject_of)

4. **Booking Relationships:**
   - 1 Booking → Many VehicleInspections (generates)

5. **VehicleInspection:**
   - 1 VehicleInspection → Many DamageReports (documents)

---

## Data Flow Architecture

### User Registration & Authentication Flow
```
Browser → React Login/Register → API Gateway
  ↓
Express Server → User Controller → User Model (MongoDB)
  ↓
JWT Token Generation → Response to Frontend
  ↓
localStorage Storage → AuthContext Update
```

### Rental Booking Flow
```
Dashboard → Rentals Component → Fetch Available Rentals
  ↓
API (GET /rentals) → Rental Controller → Model Query
  ↓
Display Rentals → User Selects Rental
  ↓
PreBooking Component → Select Dates
  ↓
API (POST /rental-bookings) → RentalBooking Controller
  ↓
Create Booking → Payment Component → Stripe/UPI
  ↓
Payment Controller → Update Payment Status
```

### Parking Spot Booking Flow
```
LiveMap Component → ParkingSpot Display
  ↓
User Selects Spot → Booking Component
  ↓
API (POST /bookings) → Booking Controller
  ↓
ML Allocation (Score/Rebalance) → Create Session
  ↓
ParkingSession Model → QR Code Generation
```

### Vehicle Inspection Flow
```
Check-in/Check-out → Inspection Component
  ↓
Image Capture → Computer Vision Processing
  ↓
License Plate Recognition → Damage Detection
  ↓
API (POST /inspections) → Inspection Controller
  ↓
Create VehicleInspection Record → Store in MongoDB
```

---

## Database Schema Organization

### Collections (9 Primary):

| Collection | Purpose | Key Relationships |
|-----------|---------|-------------------|
| **users** | User accounts & auth | Host-Rental, Renter-RentalBooking, Owner-Booking |
| **rentals** | Vehicle rentals | Host-User, Spot-ParkingSpot, Bookings-RentalBooking |
| **rentalbookings** | Rental transactions | Renter-User, Rental-Rental |
| **parkingspots** | Parking locations | Creator-User, Bookings-Booking, Rentals-Rental |
| **bookings** | Parking reservations | User-User, Spot-ParkingSpot, Sessions-ParkingSession |
| **vehicleinspections** | Inspection records | Booking-Booking, Rental-Rental, User-User |
| **maintenancealerts** | Maintenance requests | Spot-ParkingSpot, AssignedTo-User |
| **parkingsessions** | Active sessions | User-User, Booking-Booking, Spot-ParkingSpot |
| **spotsensors** | IoT sensors | Spot-ParkingSpot |

### Embedded Schemas:

- **Vehicle** (in User)
- **VehicleInfo** (in Rental, Booking)
- **DamageReport** (in VehicleInspection)
- **ParkingBehavior** (in User)
- **OperatingHours** (in ParkingSpot)
- **GeoLocation** (in ParkingSpot)
- **AuditLog** (in Rental)

---

## API Architecture

### Authentication Endpoints
```
POST   /auth/register
POST   /auth/login
POST   /auth/logout
GET    /auth/verify
```

### User Endpoints
```
GET    /users/:id
PUT    /users/:id
POST   /users/vehicle
GET    /users/vehicles
DELETE /users/vehicle/:id
```

### Rental Endpoints
```
GET    /rentals
GET    /rentals/:id
POST   /rentals
PUT    /rentals/:id
DELETE /rentals/:id
GET    /rentals/available
```

### Booking Endpoints
```
GET    /bookings
POST   /bookings
GET    /bookings/:id
PUT    /bookings/:id
DELETE /bookings/:id
GET    /bookings/user/:userId
```

### Parking Spot Endpoints
```
GET    /parking-spots
GET    /parking-spots/:id
GET    /parking-spots/city/:city
POST   /parking-spots
PUT    /parking-spots/:id
```

### Payment Endpoints
```
POST   /payments/process
POST   /payments/stripe/webhook
GET    /payments/status/:id
```

### Inspection Endpoints
```
POST   /inspections
GET    /inspections/:id
PUT    /inspections/:id/approve
```

---

## Security Architecture

### Authentication
- **JWT Tokens:** Secure token-based authentication
- **Password Hashing:** Bcrypt (10 rounds)
- **Token Storage:** localStorage (frontend), sent via Authorization header

### Authorization
- **Role-Based Access Control (RBAC):**
  - `user` - Regular user operations
  - `host` - Rental hosting capabilities
  - `admin` - Full system access
- **Middleware:** Auth middleware checks JWT and role before proceeding

### Data Protection
- **Environment Variables:** Sensitive config in .env files
- **HTTPS:** Recommended for production deployment
- **Stripe Integration:** PCI-compliant payment processing
- **Input Validation:** Schema validation via Mongoose & middleware

---

## Scalability Considerations

1. **Database Indexing:**
   - Geo-spatial indexes on ParkingSpot location
   - Composite indexes on frequently queried fields

2. **Caching:**
   - ParkingSpot listings (Redis recommended)
   - User profile data (browser localStorage)

3. **Load Balancing:**
   - Multiple Express instances behind load balancer
   - MongoDB replica set for high availability

4. **Microservices Potential:**
   - Payment Service (Stripe integration)
   - Inspection Service (CV processing)
   - Notification Service (Email/SMS)
   - Sensor Service (IoT data)

---

## Deployment Architecture

### Development
- Frontend: Vite dev server (http://localhost:5173)
- Backend: Express dev server (http://localhost:5000)
- Database: Local MongoDB instance

### Production
- **Frontend:** Vite build output → CDN/Static hosting
- **Backend:** Express server → Container (Docker) → Kubernetes/Cloud
- **Database:** MongoDB Atlas (cloud-hosted)
- **Storage:** S3/Cloud Storage for images
- **CDN:** Cloudflare for static assets

---

## Performance Optimization

1. **Frontend:**
   - Code splitting with React.lazy()
   - Image optimization (WebP format)
   - CSS-in-JS with Tailwind (utility-first)
   - Framer Motion for GPU-accelerated animations

2. **Backend:**
   - Query optimization with Lean queries
   - Connection pooling for MongoDB
   - Response compression (gzip)
   - Rate limiting on sensitive endpoints

3. **Database:**
   - Proper indexing strategy
   - Query analysis and optimization
   - Data pagination for large result sets

---

## Testing Strategy

### Unit Tests
- Model validation (Mongoose schemas)
- Controller logic (business rules)
- Utility functions (helpers, formatters)

### Integration Tests
- API endpoint flows
- Database operations
- Payment processing simulation

### E2E Tests
- User registration flow
- Rental booking flow
- Payment checkout flow
- AdminPanel operations

---

## Monitoring & Logging

### Application Metrics
- Request response times
- Error rates by endpoint
- Database query performance
- Payment transaction status

### Logging
- Centralized log aggregation (ELK Stack recommended)
- Error tracking (Sentry)
- Performance monitoring (New Relic/DataDog)

---

## Version Control & CI/CD

### Git Workflow
- Main branch: Production-ready code
- Development branch: Integration branch
- Feature branches: New features/fixes

### CI/CD Pipeline
- **Build:** Node.js dependency installation
- **Test:** Unit & integration tests
- **Lint:** ESLint code quality checks
- **Deploy:** Automated deployment to staging/production

---

## System Statistics

- **9** Domain Models
- **10** API Controllers
- **50+** API Endpoints
- **11** Supported Indian Cities
- **225** Pre-seeded Parking Spots
- **98** Tracked Features (60% complete)
- **7** In-progress Initiatives

---

**Last Updated:** March 31, 2026
**Architecture Version:** 1.0
**Status:** Active Development (Sprint 3)
