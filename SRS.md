# Software Requirements Specification (SRS)

## Project Title

Parking System - Parking Management and Car Rental Booking Platform

## Prepared On

April 23, 2026

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification defines the functional and non-functional requirements for the Parking System project. The document is based on the current implementation, including the React frontend, Express backend, MongoDB models, project documentation, and available REST API routes.

### 1.2 Scope

The system provides user authentication, parking spot management, parking bookings, live map support, parking sessions, rental listings, rental bookings, payments, inspections, maintenance alerts, sensor data management, and admin operations.

### 1.3 Intended Audience

- Project evaluators and reviewers.
- Developers maintaining the frontend and backend.
- Testers validating system behavior.
- Administrators and product stakeholders reviewing system scope.

### 1.4 Definitions

- User: A registered customer using parking or rental features.
- Admin: A privileged user who can manage platform data.
- Rental Host: An authenticated user who creates rental listings.
- Parking Spot: A managed parking location with capacity, rates, location, and availability.
- Parking Session: A started parking usage record with start time, end time, cost, and payment status.
- Rental Booking: A booking record for a rental vehicle/listing.
- Sensor: A parking spot occupancy device or simulated sensor record.

## 2. System Overview

The Parking System is a client-server web application. The frontend is a React single-page application using protected routes. The backend is a REST API built with Express.js. MongoDB stores all domain data through Mongoose schemas.

### 2.1 Product Perspective

The system is designed as an integrated mobility platform for parking and car rental workflows. It can be used as a local MVP and can be extended for production deployment, external payment webhooks, mobile apps, and advanced analytics.

### 2.2 Product Functions

- User registration, login, logout, password reset, profile update, and password change.
- Vehicle management for user-owned vehicles.
- Parking spot listing, search, detail view, creation, update, and seed setup.
- Parking session start, end, cancel, active session lookup, and history.
- Parking booking creation, cancellation, ML allocation, and admin rebalance.
- Rental listing creation, browsing, updating, deletion, and admin auditing.
- Rental booking creation, payment confirmation, cancellation, return tracking, availability checking, and booked-date lookup.
- Bank, UPI, QR, card-intent, and simulated payment workflows.
- Vehicle inspection submission and admin review.
- Maintenance alert creation, listing, update, summary, and predictive scan.
- Sensor floor map, statistics, lookup, update, and bulk update.
- Admin dashboard, analytics, user management, and spot management.

### 2.3 User Classes

- Guest: Can access public pages such as login, register, and public parking spot lookup where supported.
- Authenticated User: Can manage profile, vehicles, sessions, bookings, rentals, payments, inspections, and maintenance views.
- Rental Host: Can create and manage rental listings as an authenticated user.
- Parking Operator: Represents an operational user type in the schema for parking-related workflows.
- Admin: Can access admin-only APIs and admin frontend routes.

### 2.4 Operating Environment

- Frontend: Browser-based React application served by Vite during development.
- Backend: Node.js and Express.js server.
- Database: MongoDB accessed through Mongoose.
- Local URLs: Frontend commonly runs on `http://localhost:3000` or Vite dev port, backend runs on `http://localhost:5000`.

## 3. Functional Requirements

### 3.1 Authentication And User Management

- FR-001: The system shall allow users to register with personal details, email, phone, and password.
- FR-002: The system shall hash user passwords before storage.
- FR-003: The system shall allow users to log in and receive a JWT token.
- FR-004: The system shall protect private backend routes using bearer-token authentication.
- FR-005: The system shall allow authenticated users to log out.
- FR-006: The system shall support forgot-password and reset-password workflows.
- FR-007: The system shall allow authenticated users to view and update their profile.
- FR-008: The system shall allow authenticated users to change their password.
- FR-009: The system shall prevent inactive users from accessing protected account features.
- FR-010: The system shall support user analytics, loyalty points, payment methods, and optional biometric records.

### 3.2 Vehicle Management

- FR-011: The system shall allow authenticated users to add vehicles.
- FR-012: The system shall allow authenticated users to view all vehicles attached to their account.
- FR-013: The system shall allow authenticated users to update vehicle details.
- FR-014: The system shall allow authenticated users to delete vehicles.
- FR-015: The system shall store vehicle license plate, make, model, year, color, type, VIN, and registration/insurance metadata where provided.

### 3.3 Parking Spot Management

- FR-016: The system shall display parking spots with name, address, city, coordinates, capacity, availability, rates, amenities, operating hours, images, rating, and status.
- FR-017: The system shall allow users to view parking spot details.
- FR-018: The system shall allow authenticated users to create parking spots through backend APIs.
- FR-019: The system shall allow authenticated users to update parking spots through backend APIs.
- FR-020: The system shall provide a parking spot seed workflow for development data.
- FR-021: The system shall support geospatial indexing for parking spot location data.

### 3.4 Parking Sessions

- FR-022: The system shall allow authenticated users to start a parking session.
- FR-023: The system shall allow authenticated users to view their active parking session.
- FR-024: The system shall allow authenticated users to end a parking session.
- FR-025: The system shall calculate duration and amount when a parking session ends.
- FR-026: The system shall allow authenticated users to cancel a parking session.
- FR-027: The system shall allow authenticated users to view parking session history.

### 3.5 Parking Bookings

- FR-028: The system shall allow authenticated users to create a parking booking.
- FR-029: The system shall allow authenticated users to view their parking bookings.
- FR-030: The system shall allow authenticated users to view a parking booking by ID.
- FR-031: The system shall allow authenticated users to cancel a parking booking.
- FR-032: The system shall support ML allocation scoring for parking booking assistance.
- FR-033: The system shall allow admins to view all parking bookings.
- FR-034: The system shall allow admins to trigger booking rebalance.
- FR-035: The system shall store booking vehicle, schedule, status, ML score, payment reference, QR code, and cancellation metadata.

### 3.6 Rental Listings

- FR-036: The system shall allow authenticated users to create rental listings.
- FR-037: The system shall allow authenticated users to view available rental listings.
- FR-038: The system shall allow authenticated users to view rental listing details.
- FR-039: The system shall allow authenticated users to update their rental listings.
- FR-040: The system shall allow authenticated users to delete rental listings.
- FR-041: The system shall allow users to view their own rental listings.
- FR-042: The system shall allow admins to view all rental listings.
- FR-043: The system shall allow admins to audit rental listings.
- FR-044: The system shall store rental vehicle details, pricing, availability, status, audit history, ratings, and admin approval state.

### 3.7 Rental Bookings

- FR-045: The system shall allow authenticated users to create rental bookings.
- FR-046: The system shall allow authenticated users to view their rental bookings.
- FR-047: The system shall allow authenticated users to view rental booking details.
- FR-048: The system shall allow authenticated users to cancel rental bookings.
- FR-049: The system shall allow authenticated users to confirm rental booking payment.
- FR-050: The system shall allow the appropriate authenticated user to mark a rental as returned.
- FR-051: The system shall allow users to check rental availability for selected dates.
- FR-052: The system shall provide booked dates for rental calendar displays.
- FR-053: The system shall provide active booking lookup for a rental.
- FR-054: The system shall calculate rental booking days and total amount from selected date range, price per day, and deposit.

### 3.8 Payments

- FR-055: The system shall display available payment plans.
- FR-056: The system shall allow authenticated users to connect bank account details.
- FR-057: The system shall allow authenticated users to verify bank account details.
- FR-058: The system shall allow authenticated users to retrieve connected bank account details.
- FR-059: The system shall allow authenticated users to disconnect a bank account.
- FR-060: The system shall allow authenticated users to create a card payment intent.
- FR-061: The system shall support simulated payment for development and testing.
- FR-062: The system shall support UPI payment initiation.
- FR-063: The system shall support UPI payment verification.
- FR-064: The system shall support QR payment generation.

### 3.9 Inspections

- FR-065: The system shall allow authenticated users to submit vehicle inspections.
- FR-066: The system shall allow authenticated users to view their inspections.
- FR-067: The system shall allow admins to view all inspections.
- FR-068: The system shall allow admins to review inspections.
- FR-069: The system shall store license plate detection, damage detection, image URLs, damage reports, inspection type, approval, and review metadata.

### 3.10 Maintenance

- FR-070: The system shall allow authenticated users to view maintenance summary data.
- FR-071: The system shall allow authenticated users to view maintenance alerts.
- FR-072: The system shall allow admins to create maintenance alerts.
- FR-073: The system shall allow authenticated users to update maintenance alert status.
- FR-074: The system shall allow admins to run predictive maintenance scans.
- FR-075: The system shall store maintenance target, type, severity, status, assignment, prediction, confidence, and resolution data.

### 3.11 Sensors

- FR-076: The system shall allow authenticated users to view a sensor floor map.
- FR-077: The system shall allow admins to view sensor statistics.
- FR-078: The system shall allow admins to view a sensor by parking spot ID.
- FR-079: The system shall allow admins to update a sensor reading.
- FR-080: The system shall allow admins to bulk update sensor readings.
- FR-081: The system shall infer vehicle type from weight readings.

### 3.12 Administration

- FR-082: The system shall support one-time admin setup.
- FR-083: The system shall restrict admin dashboard and analytics APIs to admin users.
- FR-084: The system shall allow admins to view and update users.
- FR-085: The system shall allow admins to view and update parking spots.
- FR-086: The frontend shall restrict the `/admin` route to authenticated admin users.

### 3.13 Frontend Navigation

- FR-087: The frontend shall provide login and registration pages for unauthenticated users.
- FR-088: The frontend shall provide protected pages for dashboard, payment, bank connection, prebooking, live map, inspection, rentals, rental bookings, maintenance, and admin.
- FR-089: The frontend shall redirect unauthenticated users from protected routes to `/login`.
- FR-090: The frontend shall redirect non-admin users away from `/admin`.
- FR-091: The frontend shall use lazy-loaded pages and a loading state.

## 4. External Interface Requirements

### 4.1 User Interface

- The user interface shall be responsive and usable on desktop and mobile browsers.
- The user interface shall include pages for login, register, dashboard, payments, bank connection, prebooking, live map, inspections, rentals, rental booking history, maintenance, admin setup, and admin panel.
- The frontend shall show notifications for important actions using toast notifications.

### 4.2 API Interface

The backend shall expose REST API groups under `/api`:

- `/api/users` for authentication, profile, vehicles, loyalty, biometric, and account operations.
- `/api/parking` for parking spots and parking sessions.
- `/api/bookings` for parking bookings and ML allocation.
- `/api/rentals` for rental listing operations.
- `/api/rental-bookings` for rental booking operations.
- `/api/payments` for plans, bank, card, simulated, UPI, and QR workflows.
- `/api/inspections` for inspection submission and review.
- `/api/maintenance` for maintenance summaries, alerts, and predictive scans.
- `/api/sensors` for sensor maps, statistics, and readings.
- `/api/admin` for admin setup, dashboard, analytics, users, and spots.
- `/api/health` for health checks.

### 4.3 Database Interface

The system shall use MongoDB collections represented by Mongoose models:

- `User`
- `ParkingSpot`
- `ParkingSession`
- `Booking`
- `Rental`
- `RentalBooking`
- `VehicleInspection`
- `MaintenanceAlert`
- `SpotSensor`

### 4.4 Configuration Interface

- The backend shall use environment variables for `MONGODB_URI`, `JWT_SECRET`, `PORT`, `NODE_ENV`, and CORS origin.
- The frontend shall use an environment variable for the API base URL.

## 5. Non-Functional Requirements

### 5.1 Security

- NFR-001: The system shall hash passwords using bcrypt before storage.
- NFR-002: The system shall use JWT bearer tokens for protected backend routes.
- NFR-003: The system shall restrict admin-only operations to users with role `admin`.
- NFR-004: The system shall use Helmet middleware to improve HTTP header security.
- NFR-005: The system shall avoid returning sensitive fields such as password and bank account number by default.
- NFR-006: The system shall use environment variables for secrets and database configuration.

### 5.2 Performance

- NFR-007: The frontend shall lazy-load route pages to reduce initial load time.
- NFR-008: The database shall use indexes for frequently queried fields such as user/status, spot/date, city, geolocation, sensor zone, and maintenance status.
- NFR-009: API responses should complete within acceptable local development latency for MVP workflows.

### 5.3 Reliability

- NFR-010: The backend shall provide consistent JSON responses for success and failure states.
- NFR-011: The backend shall include centralized 404 and error handling middleware.
- NFR-012: The backend shall support graceful shutdown on interrupt.
- NFR-013: The backend shall retry the next port if the default port is unavailable.

### 5.4 Usability

- NFR-014: The frontend shall protect private pages and guide unauthenticated users to login.
- NFR-015: The frontend shall provide visual loading feedback during lazy page loading.
- NFR-016: Booking, payment, and dashboard workflows shall be clear enough for a non-technical user.

### 5.5 Maintainability

- NFR-017: Backend code shall be organized by models, routes, controllers, middleware, and utilities.
- NFR-018: Frontend code shall be organized by pages, components, context, and services.
- NFR-019: The system shall maintain project documentation for setup, architecture, roadmap, backlog, SOW, and SRS.

### 5.6 Scalability

- NFR-020: Parking spot location data shall support geospatial indexing.
- NFR-021: The architecture shall allow future deployment to cloud hosting and MongoDB Atlas.
- NFR-022: The architecture shall allow future separation of payment, notification, inspection, and sensor services if needed.

## 6. Data Requirements

- The system shall store users with profile, security, vehicles, loyalty, parking behavior, payment methods, and bank account metadata.
- The system shall store parking spots with capacity, availability, rates, city, address, coordinates, status, amenities, and operating hours.
- The system shall store parking sessions with user, spot, vehicle, time, duration, amount, status, and payment status.
- The system shall store parking bookings with user, spot, vehicle, schedule, status, ML score, payment reference, and QR code.
- The system shall store rentals with host, spot, vehicle, pricing, availability, status, audit log, stats, rating, and admin approval data.
- The system shall store rental bookings with renter, rental, dates, location, pricing, payment, status, damage, return, cancellation, and history.
- The system shall store inspections with booking/rental reference, user, license plate, detected plate, image URLs, damage reports, score, type, and review data.
- The system shall store maintenance alerts with target, alert type, severity, status, assignment, prediction, and resolution data.
- The system shall store spot sensors with spot, zone, bay, readings, occupancy, inferred type, battery, fault state, and ML features.

## 7. Constraints And Assumptions

- The project assumes MongoDB is available and reachable through `MONGODB_URI`.
- The project assumes JWT authentication is sufficient for the MVP.
- The project assumes payment workflows may be simulated or require external provider credentials for production.
- The project assumes seeded parking and rental data can be used for demonstration.
- The project assumes advanced features in roadmap documents are future enhancements unless implemented in code.

## 8. Acceptance Requirements

- The frontend shall build and render the defined public and protected routes.
- The backend shall start successfully and expose `/api/health`.
- Users shall be able to complete authentication and protected user workflows.
- Parking spot, parking session, parking booking, rental, rental booking, payment, maintenance, inspection, sensor, and admin APIs shall be reachable according to their authorization rules.
- Data created through APIs shall persist in MongoDB.
- Admin-only routes shall reject non-admin users.
- Errors shall return JSON responses rather than crashing the server.

## 9. Future Enhancements

- Native mobile app.
- Production CI/CD pipeline.
- Dockerized deployment.
- Stripe webhook completion and payment reconciliation.
- SMS and push notifications.
- Real computer vision service integration for inspection analysis.
- Analytics dashboard expansion.
- Redis caching and advanced monitoring.
- Enterprise parking management and fleet features.
