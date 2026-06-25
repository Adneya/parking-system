# Statement of Work (SOW)

## Project Title

Parking System - Parking Management and Car Rental Booking Platform

## Prepared On

April 23, 2026

## Project Overview

The Parking System is a web-based platform for managing parking availability, parking bookings, car rental listings, rental bookings, payments, vehicle inspections, maintenance alerts, and administrative operations. The system uses a React and Vite frontend, an Express.js backend, and MongoDB for persistent storage.

The platform is intended to support users looking for parking spaces or rental vehicles, parking operators managing locations and sessions, and administrators monitoring platform activity.

## Objectives

- Provide a secure user registration, login, and profile management experience.
- Allow users to search, view, and book parking spots.
- Support parking sessions, including start, end, cancellation, and history.
- Allow users to browse, create, manage, and book vehicle rental listings.
- Provide payment workflows for card, bank, UPI, QR, and simulated payment flows.
- Support vehicle inspections for check-in and check-out use cases.
- Track sensor data and parking occupancy information.
- Provide maintenance alert tracking and predictive maintenance workflows.
- Provide admin dashboards for users, parking spots, rentals, bookings, analytics, and platform oversight.

## Scope Of Work

### In Scope

- Frontend web application built with React 18, Vite, Tailwind CSS, React Router, Axios, Framer Motion, React Hot Toast, Leaflet, and Recharts.
- Backend REST API built with Node.js, Express.js, Mongoose, JWT authentication, Helmet, CORS, Nodemailer, QR code support, and Stripe SDK dependencies.
- MongoDB data models for users, parking spots, parking sessions, parking bookings, rental listings, rental bookings, spot sensors, inspections, and maintenance alerts.
- User authentication with JWT, password hashing, protected routes, active-account checks, and admin-only route protection.
- Parking spot discovery, parking spot details, spot creation, spot updates, seed data, and live map support.
- Parking session operations including active session lookup, session history, session start, session end, and session cancellation.
- Parking booking operations including ML allocation, booking creation, user booking history, booking detail lookup, cancellation, and admin rebalance.
- Rental listing operations including user-owned rentals, all rentals for admin, rental creation, rental listing, rental detail view, update, delete, seeding, and admin audit.
- Rental booking operations including create booking, view my bookings, view details, cancel, confirm payment, mark returned, check availability, booked dates, and active booking lookup.
- Payment workflows including payment plans, bank account connection, bank verification, bank details, bank disconnect, card payment intent, payment simulation, UPI initiation, UPI verification, and QR payment generation.
- Maintenance workflows including summary, predictive scan, alert list, alert creation, and alert update.
- Sensor workflows including floor map, sensor statistics, spot sensor lookup, single sensor update, and bulk sensor update.
- Inspection workflows including inspection submission, user inspection history, admin inspection list, and admin review.
- Admin workflows including one-time admin setup, dashboard, analytics, user management, and spot management.

### Out Of Scope

- Native iOS or Android applications.
- Production infrastructure automation, Docker, Kubernetes, or CI/CD implementation.
- Real-time push notification infrastructure.
- SMS gateway integration.
- Full live payment settlement guarantees unless external payment provider credentials and webhooks are configured.
- Advanced computer vision model training for inspection automation.
- Production-grade monitoring, observability, and incident response tooling.
- Legal, insurance, KYC, or regulatory compliance certification.

## Deliverables

- React frontend application with protected and public routes.
- Express.js backend API with modular controllers, routes, middleware, and models.
- MongoDB schemas and seed scripts for parking spots and rentals.
- JWT authentication and role-based admin access.
- Payment, booking, rental, inspection, maintenance, sensor, and admin modules.
- Project documentation including README, architecture documentation, roadmap, backlog, sprint board, SOW, and SRS.

## Stakeholders

- End Users: Register, manage profiles and vehicles, book parking spots, book rentals, make payments, and view history.
- Rental Hosts: Create and manage rental listings as authenticated users.
- Parking Operators: Manage parking-related operations where authorized.
- Administrators: Manage users, spots, rentals, bookings, analytics, sensors, inspections, and maintenance.
- Development Team: Maintain frontend, backend, database, testing, and documentation.

## Technology Stack

- Frontend: React 18, Vite, Tailwind CSS, React Router, Axios, Framer Motion, Leaflet, Recharts.
- Backend: Node.js, Express.js, Mongoose, JWT, Helmet, CORS, Nodemailer, QRCode, Stripe SDK.
- Database: MongoDB.
- Development Tools: npm, Nodemon, Jest, Supertest.

## Work Breakdown

| Phase | Activities | Output |
| --- | --- | --- |
| Planning | Define scope, requirements, user flows, and architecture | Project documentation |
| Backend Development | Build REST APIs, data models, middleware, and controllers | Express API |
| Frontend Development | Build login, dashboard, booking, rental, map, payment, admin, maintenance, and inspection pages | React web application |
| Data Setup | Create MongoDB schemas and seed parking/rental data | Testable local database |
| Integration | Connect frontend to backend through Axios services | End-to-end workflows |
| Validation | Run builds, API checks, and manual workflow testing | Verified MVP behavior |
| Documentation | Maintain README, architecture docs, SOW, and SRS | Submission-ready documents |

## Acceptance Criteria

- Users can register, log in, log out, update their profile, and manage vehicles.
- Authenticated users can view parking spots, manage parking sessions, and view parking history.
- Authenticated users can create and manage parking bookings.
- Authenticated users can browse rentals, create rentals, book rentals, and manage rental bookings.
- Payment workflows support bank, UPI, QR, simulated, and card-intent flows through backend endpoints.
- Admin users can access admin-only APIs and frontend admin routes.
- Maintenance, sensor, and inspection records can be created, viewed, updated, or reviewed according to authorization rules.
- System data is persisted in MongoDB through defined Mongoose models.
- Frontend protected routes redirect unauthenticated users to login.
- Backend exposes a health check endpoint at `/api/health`.

## Assumptions

- MongoDB is available locally or through a configured connection string.
- Required environment variables are configured before running the application.
- The application is primarily used as a web application.
- Payment workflows may require provider credentials for production use.
- Seed data is acceptable for demonstration and development environments.

## Constraints

- The frontend depends on the backend API URL configured through Vite environment variables.
- The backend depends on a MongoDB connection and `JWT_SECRET`.
- Admin-only features require a user with role `admin`.
- Some advanced roadmap items are planned but not part of the currently delivered MVP.
- Local development assumes Node.js and npm are installed.

## Risks

- Payment workflows need additional production hardening before handling real transactions.
- Sensor and inspection automation may require real devices or external ML services for production accuracy.
- Local seed data may not represent production-scale performance.
- Role naming should be kept consistent across documentation, schema, and UI.
- More automated tests are needed to reduce regression risk.

## Change Control

Any additions to scope, such as native mobile apps, full CI/CD, production deployment, live payment settlement, SMS notifications, or advanced ML, should be documented as change requests. Each change request should include impact on timeline, cost, testing, security, and deployment.

## Completion Definition

The project is considered complete for the current MVP when the documented frontend routes, backend API modules, MongoDB models, authentication, booking flows, payment flows, admin operations, and supporting documentation are available and verifiable in the local development environment.
