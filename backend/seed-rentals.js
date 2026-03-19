const mongoose = require('mongoose');
const Rental = require('./models/Rental');

mongoose.connect('mongodb://localhost:27017/parking-system').then(async () => {
  try {
    // Clear existing rentals
    await Rental.deleteMany({});
    console.log('Cleared existing rentals');

    // Create test rentals with active status
    const rentals = [
      {
        vehicleName: 'Toyota Fortuner SUV',
        vehicleType: 'SUV',
        dailyRate: 2500,
        depositAmount: 5000,
        totalSeats: 7,
        fuelType: 'Diesel',
        transmissionType: 'Automatic',
        mileage: 15,
        rating: 4.8,
        totalReviews: 245,
        status: 'active',
        images: ['https://via.placeholder.com/400x300?text=Toyota+Fortuner'],
        amenities: ['AC', 'Power Steering', 'ABS', 'Air Bags', 'GPS', 'Bluetooth'],
        description: 'Spacious and comfortable SUV perfect for family trips and adventures.',
        spot: {
          location: 'Mumbai Central',
          address: 'Fort, Mumbai',
          city: 'Mumbai'
        }
      },
      {
        vehicleName: 'Maruti Swift Hatchback',
        vehicleType: 'Hatchback',
        dailyRate: 1200,
        depositAmount: 3000,
        totalSeats: 5,
        fuelType: 'Petrol',
        transmissionType: 'Manual',
        mileage: 23,
        rating: 4.5,
        totalReviews: 182,
        status: 'active',
        images: ['https://via.placeholder.com/400x300?text=Maruti+Swift'],
        amenities: ['AC', 'Power Steering', 'ABS', 'Bluetooth'],
        description: 'Compact and fuel-efficient hatchback for city driving.',
        spot: {
          location: 'Mumbai Suburbs',
          address: 'Bandra, Mumbai',
          city: 'Mumbai'
        }
      },
      {
        vehicleName: 'Hyundai Creta SUV',
        vehicleType: 'SUV',
        dailyRate: 1800,
        depositAmount: 4000,
        totalSeats: 5,
        fuelType: 'Diesel',
        transmissionType: 'Automatic',
        mileage: 18,
        rating: 4.7,
        totalReviews: 320,
        status: 'active',
        images: ['https://via.placeholder.com/400x300?text=Hyundai+Creta'],
        amenities: ['AC', 'Power Steering', 'ABS', 'Sunroof', 'Cruise Control', 'GPS'],
        description: 'Modern compact SUV with excellent features and comfort.',
        spot: {
          location: 'Delhi Central',
          address: 'Connaught Place, Delhi',
          city: 'Delhi'
        }
      },
      {
        vehicleName: 'Honda City Sedan',
        vehicleType: 'Sedan',
        dailyRate: 1500,
        depositAmount: 3500,
        totalSeats: 5,
        fuelType: 'Petrol',
        transmissionType: 'Automatic',
        mileage: 20,
        rating: 4.6,
        totalReviews: 198,
        status: 'active',
        images: ['https://via.placeholder.com/400x300?text=Honda+City'],
        amenities: ['AC', 'Power Steering', 'ABS', 'Air Bags', 'Bluetooth', 'Rear Camera'],
        description: 'Reliable and comfortable sedan for daily commute.',
        spot: {
          location: 'Bangalore Main',
          address: 'MG Road, Bangalore',
          city: 'Bengaluru'
        }
      },
      {
        vehicleName: 'Mahindra XUV500',
        vehicleType: 'SUV',
        dailyRate: 2000,
        depositAmount: 4500,
        totalSeats: 5,
        fuelType: 'Diesel',
        transmissionType: 'Automatic',
        mileage: 17,
        rating: 4.4,
        totalReviews: 156,
        status: 'active',
        images: ['https://via.placeholder.com/400x300?text=Mahindra+XUV500'],
        amenities: ['AC', 'Power Steering', 'ABS', 'Sunroof', 'Navigation System'],
        description: 'Premium SUV with advanced features and spacious interior.',
        spot: {
          location: 'Hyderabad Main',
          address: 'Madhapur, Hyderabad',
          city: 'Hyderabad'
        }
      },
      {
        vehicleName: 'Tata Nexon EV',
        vehicleType: 'SUV',
        dailyRate: 2200,
        depositAmount: 5000,
        totalSeats: 5,
        fuelType: 'Electric',
        transmissionType: 'Automatic',
        mileage: 400,
        rating: 4.9,
        totalReviews: 89,
        status: 'active',
        images: ['https://via.placeholder.com/400x300?text=Tata+Nexon+EV'],
        amenities: ['AC', 'Power Steering', 'ABS', 'Touchscreen', 'Fast Charging Port'],
        description: 'Eco-friendly electric SUV with latest technology.',
        spot: {
          location: 'Pune Downtown',
          address: 'Baner, Pune',
          city: 'Pune'
        }
      }
    ];

    const created = await Rental.insertMany(rentals);
    console.log(`✅ Created ${created.length} active rentals`);
    created.forEach((r, i) => {
      console.log(`${i + 1}. ${r.vehicleName} (${r.vehicleType}) - ₹${r.dailyRate}/day`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
});
