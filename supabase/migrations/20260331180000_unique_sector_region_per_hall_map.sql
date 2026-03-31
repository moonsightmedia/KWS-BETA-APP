WITH ranked_regions AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY hall_map_id, sector_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS duplicate_rank
  FROM public.sector_map_regions
)
DELETE FROM public.sector_map_regions
WHERE id IN (
  SELECT id
  FROM ranked_regions
  WHERE duplicate_rank > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS sector_map_regions_hall_map_id_sector_id_key
ON public.sector_map_regions (hall_map_id, sector_id);
