export interface MapPoint {
  x: number;
  y: number;
}

export interface HallMap {
  id: string;
  name: string;
  image_url: string;
  width: number | null;
  height: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SectorMapRegion {
  id: string;
  hall_map_id: string;
  sector_id: string;
  shape_type: 'polygon';
  points_json: MapPoint[];
  label_x: number | null;
  label_y: number | null;
  z_index: number;
  created_at: string;
  updated_at: string;
}
