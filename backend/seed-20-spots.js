const mongoose = require('mongoose');
const ParkingSpot = require('./models/ParkingSpot');

mongoose.connect('mongodb://localhost:27017/parking-system').then(async () => {
  console.log('🔄 Seeding 20 parking spots per city...\n');

  const cityConfigs = [
    { city: 'Mumbai', center: [72.8777, 19.076], baseRate: 3.2, localities: ['BKC', 'Andheri', 'Powai', 'Dadar', 'Fort'] },
    { city: 'Delhi', center: [77.2090, 28.6139], baseRate: 3.0, localities: ['Connaught Place', 'Saket', 'Dwarka', 'Karol Bagh', 'Rohini'] },
    { city: 'Bengaluru', center: [77.5946, 12.9716], baseRate: 2.9, localities: ['Whitefield', 'Koramangala', 'Indiranagar', 'Hebbal', 'Electronic City'] },
    { city: 'Hyderabad', center: [78.4867, 17.3850], baseRate: 2.7, localities: ['Hitech City', 'Gachibowli', 'Secunderabad', 'Banjara Hills', 'Kukatpally'] },
    { city: 'Chennai', center: [80.2707, 13.0827], baseRate: 2.6, localities: ['T Nagar', 'OMR', 'Velachery', 'Anna Nagar', 'Guindy'] },
    { city: 'Pune', center: [73.8567, 18.5204], baseRate: 2.5, localities: ['Hinjewadi', 'Kothrud', 'Viman Nagar', 'Baner', 'Shivajinagar'] },
    { city: 'Gurgaon', center: [77.0266, 28.4595], baseRate: 2.8, localities: ['Cyber City', 'Sohna Road', 'Sector 29', 'Golf Course Road', 'Udyog Vihar'] },
    { city: 'Kolkata', center: [88.3639, 22.5726], baseRate: 2.4, localities: ['Salt Lake', 'Park Street', 'Howrah', 'New Town', 'Garia'] },
    { city: 'Ahmedabad', center: [72.5714, 23.0225], baseRate: 2.3, localities: ['Satellite', 'Navrangpura', 'CG Road', 'Thaltej', 'Bopal'] },
    { city: 'Jaipur', center: [75.7873, 26.9124], baseRate: 2.1, localities: ['Malviya Nagar', 'Mansarovar', 'MI Road', 'Vaishali Nagar', 'Civil Lines'] },
    { city: 'Lucknow', center: [80.9462, 26.8467], baseRate: 2.0, localities: ['Gomti Nagar', 'Hazratganj', 'Aliganj', 'Indira Nagar', 'Aminabad'] },
  ];

  const amenityPool = ['covered', 'security', 'cctv', 'ev_charging', 'handicap'];
  const perCity = 20;
  const generatedSpots = [];

  for (const cfg of cityConfigs) {
    // Get existing count for this city
    const existingCount = await ParkingSpot.countDocuments({ city: cfg.city });
    
    for (let i = existingCount; i < existingCount + perCity; i += 1) {
      const serial = i + 1;
      const locality = cfg.localities[i % cfg.localities.length];
      const totalSpots = 70 + Math.floor(Math.random() * 330);
      const availableRatio = 0.2 + Math.random() * 0.7;
      const availableSpots = Math.max(1, Math.floor(totalSpots * availableRatio));
      const hourlyRate = Number((cfg.baseRate + (Math.random() * 2.2 - 0.4)).toFixed(1));
      const dailyRate = Number((hourlyRate * (8 + Math.random() * 4)).toFixed(1));
      const amenities = amenityPool.filter(() => Math.random() > 0.35);
      if (!amenities.length) amenities.push('security');

      const lonJitter = (Math.random() - 0.5) * 0.22;
      const latJitter = (Math.random() - 0.5) * 0.22;

      generatedSpots.push({
        name: `${locality} Parking Hub ${serial}`,
        address: `${100 + (serial % 900)} ${locality} Main Road`,
        city: cfg.city,
        totalSpots,
        availableSpots,
        hourlyRate,
        dailyRate,
        amenities,
        operatingHours: {
          is24Hours: Math.random() > 0.35,
          open: '06:00',
          close: '23:30',
        },
        rating: Number((3.2 + Math.random() * 1.8).toFixed(1)),
        totalRatings: 25 + Math.floor(Math.random() * 1800),
        location: {
          type: 'Point',
          coordinates: [
            Number((cfg.center[0] + lonJitter).toFixed(6)),
            Number((cfg.center[1] + latJitter).toFixed(6)),
          ],
        },
      });
    }
  }

  const inserted = await ParkingSpot.insertMany(generatedSpots, { ordered: false });
  console.log(`✅ Created ${inserted.length} new parking spots\n`);

  const byCities = await ParkingSpot.aggregate([
    { $group: { _id: '$city', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  console.log('📍 Parking spots per city:');
  let total = 0;
  byCities.forEach(doc => {
    console.log('   ' + doc._id.padEnd(15) + ': ' + doc.count + ' spots');
    total += doc.count;
  });
  console.log('\n   TOTAL: ' + total + ' parking spots\n');

  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
