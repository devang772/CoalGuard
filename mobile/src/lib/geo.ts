export interface LocationPoint {
  latitude: number;
  longitude: number;
}

export interface GeofencePolygon {
  id: string;
  name: string;
  coordinates: LocationPoint[]; // Order: [pt1, pt2, pt3, ...]
}

/**
  Haversine formula to compute distance in meters between two lat/lng coordinates
 */
export function getDistanceMeters(
  point1: LocationPoint,
  point2: LocationPoint
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const dLng = ((point2.longitude - point1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((point1.latitude * Math.PI) / 180) *
      Math.cos((point2.latitude * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
  Ray casting algorithm to determine if point is inside polygon
 */
export function isPointInPolygon(
  point: LocationPoint,
  polygon: LocationPoint[]
): boolean {
  let inside = false;
  const x = point.longitude;
  const y = point.latitude;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Mock mine polygon centered around Moonidih UG, BCCL, Jharia Area (23.75 N, 86.42 E)
 */
export const MOONIDIH_MINE_POLYGON: LocationPoint[] = [
  { latitude: 23.7580, longitude: 86.4120 },
  { latitude: 23.7595, longitude: 86.4280 },
  { latitude: 23.7440, longitude: 86.4310 },
  { latitude: 23.7410, longitude: 86.4150 },
];

export const MOONIDIH_CENTER: LocationPoint = {
  latitude: 23.7500,
  longitude: 86.4200,
};
