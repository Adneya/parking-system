const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/parking-system').then(async () => {
  const ParkingSpot = require('./models/ParkingSpot');
  
  const total = await ParkingSpot.countDocuments();
  console.log('Total parking spots:', total);
  
  const byCities = await ParkingSpot.aggregate([
    { $group: { _id: '$city', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  
  console.log('\nSpots by city:');
  byCities.forEach(doc => console.log('  ' + doc._id + ':', doc.count));
  
  process.exit(0);
}).catch(err => {
  console.error('Database error:', err);
  process.exit(1);
});
