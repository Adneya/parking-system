const mongoose = require('mongoose');
const Rental = require('./models/Rental');
const User = require('./models/User');
const ParkingSpot = require('./models/ParkingSpot');

mongoose.connect('mongodb://localhost:27017/parking-system').then(async () => {
  try {
    // Clear existing rentals
    await Rental.deleteMany({});
    console.log('Cleared existing rentals\n');

    // Get the first user and parking spots
    const host = await User.findOne();
    const spots = await ParkingSpot.find().limit(6);

    if (!host) {
      console.error('No users found in database');
      process.exit(1);
    }

    if (spots.length < 6) {
      console.error('Not enough parking spots');
      process.exit(1);
    }

    // Create test rentals with active status
    const rentals = [
      {
        host: host._id,
        spot: spots[0]._id,
        title: 'Toyota Fortuner SUV',
        description: 'Spacious and comfortable SUV perfect for family trips and adventures.',
        vehicle: {
          make: 'Toyota',
          model: 'Fortuner',
          year: 2023,
          licensePlate: 'DL01AB1234',
          type: 'suv',
          fuelType: 'diesel',
          seats: 7,
          features: ['AC', 'Power Steering', 'ABS', 'Air Bags', 'GPS', 'Bluetooth'],
          images: ['https://via.placeholder.com/400x300?text=Toyota+Fortuner'],
        },
        dailyRate: 2500,
        depositAmount: 5000,
        status: 'active',
      },
      {
        host: host._id,
        spot: spots[1]._id,
        title: 'Maruti Swift Hatchback',
        description: 'Compact and fuel-efficient hatchback for city driving.',
        vehicle: {
          make: 'Maruti',
          model: 'Swift',
          year: 2023,
          licensePlate: 'MH02CD5678',
          type: 'car',
          fuelType: 'petrol',
          seats: 5,
          features: ['AC', 'Power Steering', 'ABS', 'Bluetooth'],
          images: ['https://via.placeholder.com/400x300?text=Maruti+Swift'],
        },
        dailyRate: 1200,
        depositAmount: 3000,
        status: 'active',
      },
      {
        host: host._id,
        spot: spots[2]._id,
        title: 'Hyundai Creta SUV',
        description: 'Modern compact SUV with excellent features and comfort.',
        vehicle: {
          make: 'Hyundai',
          model: 'Creta',
          year: 2023,
          licensePlate: 'KA03EF9101',
          type: 'suv',
          fuelType: 'diesel',
          seats: 5,
          features: ['AC', 'Power Steering', 'ABS', 'Sunroof', 'Cruise Control', 'GPS'],
          images: ['https://via.placeholder.com/400x300?text=Hyundai+Creta'],
        },
        dailyRate: 1800,
        depositAmount: 4000,
        status: 'active',
      },
      {
        host: host._id,
        spot: spots[3]._id,
        title: 'Honda City Sedan',
        description: 'Reliable and comfortable sedan for daily commute.',
        vehicle: {
          make: 'Honda',
          model: 'City',
          year: 2022,
          licensePlate: 'GJ04GH1112',
          type: 'car',
          fuelType: 'petrol',
          seats: 5,
          features: ['AC', 'Power Steering', 'ABS', 'Air Bags', 'Bluetooth', 'Rear Camera'],
          images: ['https://via.placeholder.com/400x300?text=Honda+City'],
        },
        dailyRate: 1500,
        depositAmount: 3500,
        status: 'active',
      },
      {
        host: host._id,
        spot: spots[4]._id,
        title: 'Mahindra XUV500',
        description: 'Premium SUV with advanced features and spacious interior.',
        vehicle: {
          make: 'Mahindra',
          model: 'XUV500',
          year: 2023,
          licensePlate: 'TN05IJ1314',
          type: 'suv',
          fuelType: 'diesel',
          seats: 5,
          features: ['AC', 'Power Steering', 'ABS', 'Sunroof', 'Navigation System'],
          images: ['https://via.placeholder.com/400x300?text=Mahindra+XUV500'],
        },
        dailyRate: 2000,
        depositAmount: 4500,
        status: 'active',
      },
      {
        host: host._id,
        spot: spots[5]._id,
        title: 'Tata Nexon EV',
        description: 'Eco-friendly electric SUV with latest technology.',
        vehicle: {
          make: 'Tata',
          model: 'Nexon EV',
          year: 2023,
          licensePlate: 'RJ06KL1516',
          type: 'ev',
          fuelType: 'electric',
          seats: 5,
          features: ['AC', 'Power Steering', 'ABS', 'Touchscreen', 'Fast Charging Port'],
          images: ['https://via.placeholder.com/400x300?text=Tata+Nexon+EV'],
        },
        dailyRate: 2200,
        depositAmount: 5000,
        status: 'active',
      },
    ];

    const created = await Rental.insertMany(rentals);
    console.log(`✅ Created ${created.length} active rentals:\n`);
    created.forEach((r, i) => {
      console.log(`${i + 1}. ${r.title} - ₹${r.dailyRate}/day`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
});
