/** WGS84 point. Stored as PostGIS geography(Point, 4326) in Supabase. */
export interface LatLon {
  lat: number;
  lon: number;
}
