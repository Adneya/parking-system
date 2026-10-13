# 🅿️ Parking System - Car Rental Booking with Payment

A comprehensive parking management and car rental booking system with integrated payment features, built with modern web technologies.

## 🚀 Features

### Car Rental Booking System
- ✅ **Browse Rentals** - View available vehicles with pricing and details
- ✅ **4-Step Booking Flow**
  - Step 1: Date selection with real-time availability checking
  - Step 2: Pickup/dropoff locations and notes
  - Step 3: Payment method selection and confirmation
  - Step 4: Booking confirmation with ID
- ✅ **Payment Integration**
  - 📱 UPI with QR code generation
  - 💳 Credit/Debit Card support
  - 🏦 Bank Transfer with copy-to-clipboard
- ✅ **Booking Management** - View, filter, and cancel bookings
- ✅ **Dashboard Integration** - Quick access to bookings

### Parking Management
- **Spot Management** - View and manage parking spots across cities
- **Spot Availability** - Real-time availability tracking
- **225 Parking Spots** - Seeded across 11 Indian cities
- **Live Map** - Visual representation of available spots
- **Pre-booking** - Reserve spots in advance
- **Maintenance Alerts** - Track maintenance issues

### User Management
- **Authentication** - JWT-based secure login
- **User Profiles** - Manage user information
- **Booking History** - Track all rental bookings
- **Payment History** - View transaction details

## 📋 Project Structure

```
parking-system/
├── backend/
│   ├── models/
│   │   ├── RentalBooking.js      # Rental booking model
│   │   ├── Rental.js             # Rental vehicle model
│   │   ├── User.js               # User model
│   │   ├── ParkingSpot.js        # Parking spot model
│   │   └── ...
│   ├── controllers/
│   │   ├── rentalBookingController.js  # Booking logic
│   │   ├── rentalController.js         # Rental CRUD
│   │   ├── parkingController.js        # Spot management
│   │   └── ...
│   ├── routes/
│   │   ├── rentalBookingRoutes.js      # Booking endpoints
│   │   └── ...
│   ├── middleware/
│   │   └── auth.js               # JWT authentication
│   ├── server.js                 # Express server setup
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── RentalBookingModal.jsx   # Booking UI component
    │   ├── pages/
    │   │   ├── Rentals.jsx              # Browse rentals
    │   │   ├── MyRentalBookings.jsx     # Booking history
    │   │   ├── Dashboard.jsx            # Main dashboard
    │   │   └── ...
    │   ├── services/
    │   │   └── api.js             # API client
    │   ├── context/
    │   │   └── AuthContext.jsx    # Auth state
    │   └── App.jsx
    ├── vite.config.js
    └── package.json
```

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js (v22.14.0+)
- **Framework**: Express.js
- **Database**: MongoDB 8.0 Community Edition
- **ODM**: Mongoose
- **Authentication**: JWT
- **Utilities**: dotenv, nodemailer, stripe (future)

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Animations**: Framer Motion
- **Icons**: React Icons
- **HTTP Client**: Axios
- **Notifications**: React Hot Toast
- **QR Code**: qrcode library

## 📦 Installation

### Prerequisites
- Node.js v20+ (https://nodejs.org/)
- MongoDB Community Edition (https://www.mongodb.com/try/download/community)
- Git

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Configure .env with your MongoDB instance
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Server running on:
- Backend: http://localhost:5000
- Frontend: http://localhost:3000

## Docker

Docker Compose runs the React frontend, Express API, and MongoDB together. From
the project root, create a local environment file and start the stack:

```bash
cp .env.example .env
docker compose up --build
```

Open http://localhost:3000 for the application. The API is also available at
http://localhost:5000/api/health, and MongoDB data is kept in the named
`mongo-data` volume.

Before any non-local deployment, replace `JWT_SECRET` in `.env` with a long,
random value. To stop the containers, run `docker compose down`; add `-v` only
when you intentionally want to remove the stored database data.

### Single-service Render deployment

The root `Dockerfile` builds the frontend and serves it from the Express API,
so it deploys as one Render **Web Service**. It still needs a managed MongoDB
database, such as MongoDB Atlas.

1. Push this repository to GitHub and create a Render Web Service from it.
2. Set the service runtime to **Docker** and use `./Dockerfile` at the project
   root.
3. Set the health check path to `/api/health`.
4. Add these Render environment variables:

   ```text
   MONGODB_URI=mongodb+srv://.../parking-system
   JWT_SECRET=<a-long-random-secret>
   PORT=5000
   NODE_ENV=production
   SERVE_FRONTEND=true
   APP_URL=https://<your-service>.onrender.com
   CORS_ORIGIN=https://<your-service>.onrender.com
   ```

The deployed application and API will both be available from the same Render
URL; the frontend calls `/api`, so no API hostname configuration is required.

## 📊 Database Setup

### Parking Spots
Seeded with 225 spots across 11 cities:
- Mumbai: 21 spots, Delhi: 21, Bengaluru: 21, Hyderabad: 21, Pune: 21
- Gurgaon: 20, Chennai: 20, Kolkata: 20, Ahmedabad: 20, Jaipur: 20, Lucknow: 20

Each spot includes: location, address, hourly/daily rates, amenities, operating hours, GPS coordinates

### Test Rentals
6 vehicles seeded for testing:
1. Toyota Fortuner SUV - ₹2500/day
2. Maruti Swift Hatchback - ₹1200/day
3. Hyundai Creta SUV - ₹1800/day
4. Honda City Sedan - ₹1500/day
5. Mahindra XUV500 - ₹2000/day
6. Tata Nexon EV - ₹2200/day

## 🎯 API Endpoints

### Rental Bookings
- `POST /api/rental-bookings` - Create booking
- `GET /api/rental-bookings` - Get user's bookings
- `GET /api/rental-bookings/:id` - Get booking details
- `PUT /api/rental-bookings/:id/confirm-payment` - Confirm payment
- `PUT /api/rental-bookings/:id/cancel` - Cancel booking
- `PUT /api/rental-bookings/:id/return` - Mark as returned
- `GET /api/rental-bookings/rental/:rentalId/availability` - Check availability
- `GET /api/rental-bookings/rental/:rentalId/booked-dates` - Get booked dates

### Rentals
- `GET /api/rentals` - List all rentals
- `GET /api/rentals/:id` - Get rental details
- `POST /api/rentals` - Create rental (host)
- `PUT /api/rentals/:id` - Update rental
- `DELETE /api/rentals/:id` - Delete rental

### Parking Spots
- `GET /api/parking` - List spots
- `GET /api/parking/:id` - Get spot details
- `PUT /api/parking/:id/book` - Book a spot

## 🔐 Environment Variables

### Backend (.env)
```
MONGO_URI=mongodb://localhost:27017/parking-system
JWT_SECRET=your_secret_key_here
PORT=5000
NODE_ENV=development
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
```

## 🚀 GitHub Setup

### First Time Setup
```bash
# Navigate to project directory
cd parking-system

# Initialize git (already done)
git init

# Verify branches
git branch -a

# You should see:
# * main
#   develop
```

### Push to GitHub

1. **Create a new repository on GitHub**
   - Go to https://github.com/new
   - Repository name: `parking-system`
   - Choose Private or Public
   - Do NOT initialize with README (we have one)
   - Click "Create repository"

2. **Add GitHub remote and push**
   ```bash
   # Add remote
   git remote add origin https://github.com/YOUR_USERNAME/parking-system.git
   
   # Push main branch
   git branch -M main
   git push -u origin main
   
   # Push develop branch
   git push -u origin develop
   ```

3. **Verify on GitHub**
   - Go to your repository
   - Should see `main` and `develop` branches
   - All commits visible in main branch history

### Branch Strategy

- **main** - Production-ready code, stable releases
- **develop** - Integration branch for features
- **feature/*** - Individual feature branches (optional)

Create feature branches:
```bash
# Create from develop
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# After work, push and create PR
git push -u origin feature/your-feature-name
```

## 📝 Usage Example

### Book a Rental
1. Login/Register at http://localhost:3000
2. Navigate to "Rentals"
3. Click "Book Now" on a vehicle
4. Select dates and verify availability
5. Add pickup/dropoff details
6. Select payment method (UPI/Card/Bank)
7. For UPI: Scan QR code in your banking app
8. Enter transaction ID from your app
9. Confirm payment
10. Done! Booking confirmed

### View My Bookings
1. Click "📅 My Bookings" on Dashboard
2. Filter by status: pending, confirmed, active, completed
3. Cancel pending/confirmed bookings
4. View pricing breakdown and damage charges

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Or on Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### MongoDB Connection Error
```bash
# Start MongoDB
mongod --dbpath C:\data\db

# Or on Mac/Linux
brew services start mongodb-community
```

### Frontend Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## 📈 Future Enhancements

- [ ] Stripe payment integration
- [ ] PhonePe and Google Pay support
- [ ] Automated webhook confirmations
- [ ] Insurance options
- [ ] Partial payment (advance + pay-on-pickup)
- [ ] Invoice generation (PDF)
- [ ] Email notifications
- [ ] SMS alerts
- [ ] Driver license verification
- [ ] Insurance verification
- [ ] Admin analytics dashboard
- [ ] Customer reviews and ratings

## 📄 License

MIT License - feel free to use this project

## 👤 Author

Adneya Khatate
- GitHub: [@adneyakhatate](https://github.com/Adneya/)

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Email: adneya.khatate24@vit.edu

---

**Last Updated**: March 19, 2026
**Version**: 1.0.0 (Initial Release)
