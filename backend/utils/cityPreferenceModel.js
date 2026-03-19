const fs = require('fs');
const path = require('path');

const datasetPath = path.join(__dirname, '..', 'data', 'cityPreferenceDataset.json');
let cachedDataset = null;

function loadDataset() {
  if (cachedDataset) return cachedDataset;
  try {
    const raw = fs.readFileSync(datasetPath, 'utf8');
    cachedDataset = JSON.parse(raw);
  } catch (err) {
    cachedDataset = [];
  }
  return cachedDataset;
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function tokenize(value) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function getDurationBucket(durationHours) {
  if (durationHours <= 2) return 'short';
  if (durationHours <= 6) return 'medium';
  return 'long';
}

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function overlapScore(left, right) {
  const leftTokens = tokenize(left);
  const rightTokens = tokenize(right);
  if (!leftTokens.length || !rightTokens.length) return 0;
  const rightSet = new Set(rightTokens);
  const matched = leftTokens.filter((token) => rightSet.has(token)).length;
  return matched / Math.max(leftTokens.length, rightTokens.length);
}

function getSpotCoordinates(spot) {
  const coords = spot?.location?.coordinates;
  if (!Array.isArray(coords) || coords.length !== 2) return null;
  const [longitude, latitude] = coords;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
  return { latitude, longitude };
}

function scoreCityPreference(spot, context) {
  const dataset = loadDataset();
  if (!dataset.length) {
    return { preferenceScore: 50, localityMatch: 0, cityMatch: 0, distanceKm: null };
  }

  const requestedCity = normalizeText(context.preferredCity);
  const requestedLocality = normalizeText(context.preferredLocality);
  const preferredLatitude = Number.isFinite(context.preferredLatitude) ? context.preferredLatitude : null;
  const preferredLongitude = Number.isFinite(context.preferredLongitude) ? context.preferredLongitude : null;
  const durationBucket = getDurationBucket(context.durationHours || 0);
  const spotCity = normalizeText(spot.city);
  const spotLocalityText = `${spot.name || ''} ${spot.address || ''}`;
  const spotCoordinates = getSpotCoordinates(spot);

  const scoredRows = dataset
    .map((row) => {
      const rowCity = normalizeText(row.city);
      const rowLocality = normalizeText(row.locality);

      const citySimilarity = requestedCity
        ? (requestedCity === rowCity ? 1 : 0)
        : (spotCity === rowCity ? 1 : 0.25);

      const vehicleSimilarity = normalizeText(context.vehicleType) === normalizeText(row.vehicleType) ? 1 : 0.35;
      const coveredSimilarity = context.preferCovered === Boolean(row.preferCovered) ? 1 : 0.5;
      const evSimilarity = context.preferEV === Boolean(row.preferEV) ? 1 : 0.5;
      const durationSimilarity = durationBucket === normalizeText(row.durationBucket) ? 1 : 0.6;
      const localitySimilarity = requestedLocality
        ? overlapScore(requestedLocality, rowLocality)
        : 0.5;

      const cityAlignment = spotCity === rowCity ? 1 : 0.15;
      const spotLocalitySimilarity = requestedLocality
        ? overlapScore(requestedLocality, spotLocalityText)
        : 0.5;

      let distanceKm = null;
      if (spotCoordinates && preferredLatitude !== null && preferredLongitude !== null) {
        distanceKm = haversineDistanceKm(
          preferredLatitude,
          preferredLongitude,
          spotCoordinates.latitude,
          spotCoordinates.longitude,
        );
      } else if (spotCoordinates && Number.isFinite(row.preferredLatitude) && Number.isFinite(row.preferredLongitude)) {
        distanceKm = haversineDistanceKm(
          row.preferredLatitude,
          row.preferredLongitude,
          spotCoordinates.latitude,
          spotCoordinates.longitude,
        );
      }

      const distanceSimilarity = distanceKm === null ? 0.7 : Math.max(0, 1 - distanceKm / 20);
      const similarity = (
        citySimilarity * 0.28 +
        vehicleSimilarity * 0.16 +
        coveredSimilarity * 0.08 +
        evSimilarity * 0.08 +
        durationSimilarity * 0.12 +
        localitySimilarity * 0.12 +
        spotLocalitySimilarity * 0.08 +
        distanceSimilarity * 0.08
      ) * cityAlignment;

      return {
        weightedScore: row.satisfactionScore * similarity,
        weight: similarity,
        distanceKm,
      };
    })
    .filter((row) => row.weight > 0);

  if (!scoredRows.length) {
    return { preferenceScore: 50, localityMatch: 0, cityMatch: 0, distanceKm: null };
  }

  const totalWeight = scoredRows.reduce((sum, row) => sum + row.weight, 0);
  const weightedScore = scoredRows.reduce((sum, row) => sum + row.weightedScore, 0) / totalWeight;
  const localityMatch = requestedLocality ? overlapScore(requestedLocality, spotLocalityText) : 0;
  const cityMatch = requestedCity ? (spotCity === requestedCity ? 1 : 0) : 0;
  const nearestDistance = scoredRows
    .map((row) => row.distanceKm)
    .filter((distance) => typeof distance === 'number')
    .sort((left, right) => left - right)[0] ?? null;

  return {
    preferenceScore: Math.max(0, Math.min(100, Math.round(weightedScore))),
    localityMatch: Number(localityMatch.toFixed(2)),
    cityMatch,
    distanceKm: nearestDistance === null ? null : Number(nearestDistance.toFixed(2)),
  };
}

module.exports = {
  getDurationBucket,
  scoreCityPreference,
};