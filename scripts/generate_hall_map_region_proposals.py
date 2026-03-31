from __future__ import annotations

import json
import math
from collections import deque
from pathlib import Path
from typing import Dict, Iterable, List, Sequence, Tuple

from PIL import Image


REPO_ROOT = Path(__file__).resolve().parent.parent
PNG_PATH = REPO_ROOT / "src" / "assets" / "boulderkarte-original.png"
DOCS_JSON_PATH = REPO_ROOT / "docs" / "hall-map-region-proposals.json"
UI_JSON_PATH = REPO_ROOT / "src" / "data" / "hallMapRegionProposals.json"
DOCS_SVG_PATH = REPO_ROOT / "docs" / "hall-map-region-proposals.svg"

WORK_WIDTH = 735
WORK_HEIGHT = 466
MIN_COMPONENT_AREA = 500
MAX_RGB_DELTA = 20
MIN_RGB = 120
MAX_RGB = 235
SIMPLIFY_EPSILON = 1.75


Point = Tuple[float, float]
IntPoint = Tuple[int, int]


def round_value(value: float, decimals: int = 2) -> float:
    factor = 10 ** decimals
    return round(value * factor) / factor


def is_wall_pixel(rgb: Tuple[int, int, int]) -> bool:
    r, g, b = rgb
    if min(r, g, b) < MIN_RGB or max(r, g, b) > MAX_RGB:
      return False
    return max(abs(r - g), abs(g - b), abs(r - b)) <= MAX_RGB_DELTA


def load_mask() -> Tuple[List[List[bool]], Image.Image]:
    image = Image.open(PNG_PATH).convert("RGB").resize((WORK_WIDTH, WORK_HEIGHT), Image.Resampling.LANCZOS)
    pixels = image.load()
    mask = [[False for _ in range(WORK_HEIGHT)] for _ in range(WORK_WIDTH)]

    for x in range(WORK_WIDTH):
        for y in range(WORK_HEIGHT):
            mask[x][y] = is_wall_pixel(pixels[x, y])

    return mask, image


def find_components(mask: List[List[bool]]) -> List[List[IntPoint]]:
    visited = [[False for _ in range(WORK_HEIGHT)] for _ in range(WORK_WIDTH)]
    components: List[List[IntPoint]] = []

    for start_x in range(WORK_WIDTH):
        for start_y in range(WORK_HEIGHT):
            if visited[start_x][start_y] or not mask[start_x][start_y]:
                continue

            queue: deque[IntPoint] = deque([(start_x, start_y)])
            visited[start_x][start_y] = True
            component: List[IntPoint] = []

            while queue:
                x, y = queue.popleft()
                component.append((x, y))

                for next_x, next_y in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= next_x < WORK_WIDTH and 0 <= next_y < WORK_HEIGHT and not visited[next_x][next_y]:
                        visited[next_x][next_y] = True
                        if mask[next_x][next_y]:
                            queue.append((next_x, next_y))

            if len(component) >= MIN_COMPONENT_AREA:
                components.append(component)

    return components


def build_edges(component_pixels: Iterable[IntPoint], component_lookup: set[IntPoint]) -> Dict[IntPoint, List[IntPoint]]:
    edges: Dict[IntPoint, List[IntPoint]] = {}

    def add_edge(start: IntPoint, end: IntPoint) -> None:
        edges.setdefault(start, []).append(end)

    for x, y in component_pixels:
        if (x, y - 1) not in component_lookup:
            add_edge((x, y), (x + 1, y))
        if (x + 1, y) not in component_lookup:
            add_edge((x + 1, y), (x + 1, y + 1))
        if (x, y + 1) not in component_lookup:
            add_edge((x + 1, y + 1), (x, y + 1))
        if (x - 1, y) not in component_lookup:
            add_edge((x, y + 1), (x, y))

    return edges


def trace_loops(edges: Dict[IntPoint, List[IntPoint]]) -> List[List[IntPoint]]:
    visited: set[Tuple[IntPoint, IntPoint]] = set()
    loops: List[List[IntPoint]] = []

    for start, neighbors in edges.items():
        for next_point in neighbors:
            edge = (start, next_point)
            if edge in visited:
                continue

            loop = [start]
            current = start
            following = next_point

            while True:
                visited.add((current, following))
                loop.append(following)

                if following == start:
                    break

                candidates = edges.get(following, [])
                next_candidate = None
                for candidate in candidates:
                    if candidate != current and (following, candidate) not in visited:
                        next_candidate = candidate
                        break

                if next_candidate is None:
                    break

                current, following = following, next_candidate

            if len(loop) > 3 and loop[-1] == loop[0]:
                loops.append(loop[:-1])

    return loops


def polygon_area(points: Sequence[Point]) -> float:
    area = 0.0
    for index, (x1, y1) in enumerate(points):
        x2, y2 = points[(index + 1) % len(points)]
        area += x1 * y2 - x2 * y1
    return abs(area / 2.0)


def polygon_centroid(points: Sequence[Point]) -> Point:
    if len(points) < 3:
        total_x = sum(point[0] for point in points)
        total_y = sum(point[1] for point in points)
        return total_x / len(points), total_y / len(points)

    signed_area = 0.0
    centroid_x = 0.0
    centroid_y = 0.0

    for index, (x1, y1) in enumerate(points):
        x2, y2 = points[(index + 1) % len(points)]
        factor = x1 * y2 - x2 * y1
        signed_area += factor
        centroid_x += (x1 + x2) * factor
        centroid_y += (y1 + y2) * factor

    signed_area /= 2.0
    if abs(signed_area) < 1e-6:
        xs = [point[0] for point in points]
        ys = [point[1] for point in points]
        return (min(xs) + max(xs)) / 2.0, (min(ys) + max(ys)) / 2.0

    return centroid_x / (6.0 * signed_area), centroid_y / (6.0 * signed_area)


def perpendicular_distance(point: Point, start: Point, end: Point) -> float:
    if start == end:
        return math.dist(point, start)

    numerator = abs(
        (end[1] - start[1]) * point[0]
        - (end[0] - start[0]) * point[1]
        + end[0] * start[1]
        - end[1] * start[0]
    )
    denominator = math.hypot(end[1] - start[1], end[0] - start[0])
    return numerator / denominator


def rdp(points: Sequence[Point], epsilon: float) -> List[Point]:
    if len(points) < 3:
        return list(points)

    max_distance = -1.0
    max_index = 0
    for index in range(1, len(points) - 1):
        distance = perpendicular_distance(points[index], points[0], points[-1])
        if distance > max_distance:
            max_distance = distance
            max_index = index

    if max_distance > epsilon:
        left = rdp(points[: max_index + 1], epsilon)
        right = rdp(points[max_index:], epsilon)
        return left[:-1] + right

    return [points[0], points[-1]]


def simplify_closed_polygon(points: Sequence[Point], epsilon: float) -> List[Point]:
    if len(points) < 4:
        return list(points)

    extended = list(points) + [points[0]]
    simplified = rdp(extended, epsilon)
    if simplified[-1] == simplified[0]:
        simplified = simplified[:-1]

    deduped: List[Point] = []
    for point in simplified:
        if not deduped or point != deduped[-1]:
            deduped.append(point)

    return deduped


def percent_point(point: Point) -> Dict[str, float]:
    x, y = point
    return {
        "x": round_value((x / WORK_WIDTH) * 100),
        "y": round_value((y / WORK_HEIGHT) * 100),
    }


def build_component_polygon(component: List[IntPoint]) -> Tuple[List[Point], float, Point, Dict[str, float]]:
    component_lookup = set(component)
    edges = build_edges(component, component_lookup)
    loops = trace_loops(edges)
    if not loops:
        raise RuntimeError("No boundary loop could be traced for a component.")

    outer_loop = max(loops, key=lambda loop: polygon_area(loop))
    simplified = simplify_closed_polygon(outer_loop, SIMPLIFY_EPSILON)
    if len(simplified) < 3:
        simplified = outer_loop

    area = polygon_area(simplified)
    centroid = polygon_centroid(simplified)
    xs = [point[0] for point in simplified]
    ys = [point[1] for point in simplified]
    bounds = {
        "minX": round_value((min(xs) / WORK_WIDTH) * 100),
        "maxX": round_value((max(xs) / WORK_WIDTH) * 100),
        "minY": round_value((min(ys) / WORK_HEIGHT) * 100),
        "maxY": round_value((max(ys) / WORK_HEIGHT) * 100),
    }

    return simplified, area, centroid, bounds


def build_preview_svg(proposals: Sequence[dict]) -> str:
    overlay = []
    for proposal in proposals:
        point_list = " ".join(
            f"{round_value((point['x'] / 100) * WORK_WIDTH, 1)},{round_value((point['y'] / 100) * WORK_HEIGHT, 1)}"
            for point in proposal["points_json"]
        )
        overlay.append(
            f'<polygon points="{point_list}" fill="rgba(54,181,49,0.10)" stroke="#36B531" '
            'stroke-width="2" stroke-dasharray="8 8" />'
        )

    return "\n".join(
        [
            f'<svg width="{WORK_WIDTH}" height="{WORK_HEIGHT}" viewBox="0 0 {WORK_WIDTH} {WORK_HEIGHT}" xmlns="http://www.w3.org/2000/svg">',
            '<image href="../src/assets/boulderkarte-original.png" width="735" height="466" preserveAspectRatio="none" />',
            '<g>',
            *overlay,
            '</g>',
            '</svg>',
        ]
    )


def main() -> None:
    mask, _image = load_mask()
    components = find_components(mask)

    proposals = []
    for index, component in enumerate(
        sorted(
            components,
            key=lambda pixels: (polygon_centroid([(point[0], point[1]) for point in pixels])[1], polygon_centroid([(point[0], point[1]) for point in pixels])[0]),
        ),
        start=1,
    ):
        polygon, area, centroid, bounds = build_component_polygon(component)
        proposals.append(
            {
                "id": f"candidate-{index:02d}",
                "label": str(index),
                "source": "png-segmentation",
                "surfaceRole": "wall",
                "pointCount": len(polygon),
                "areaPx": round_value(area, 1),
                "centroid": percent_point(centroid),
                "label_x": percent_point(centroid)["x"],
                "label_y": percent_point(centroid)["y"],
                "bounds": bounds,
                "points_json": [percent_point(point) for point in polygon],
            }
        )

    output = {
        "generatedAt": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "source": {
            "imagePath": "src/assets/boulderkarte-original.png",
            "workWidth": WORK_WIDTH,
            "workHeight": WORK_HEIGHT,
            "candidateCount": len(proposals),
            "method": "png-wall-segmentation",
        },
        "notes": [
            "Die Kandidaten werden direkt aus der sichtbaren PNG-Hallenkarte segmentiert.",
            "Es werden nur graue Wandflaechen erkannt; weisse Freiflaechen und schwarze Trennlinien sind ausgeschlossen.",
            "Die Punkte sind bereits auf 0..100 fuer sector_map_regions.points_json normalisiert.",
            "Die Zuordnung zu echten Sektornamen bleibt fachlich offen und muss bestaetigt werden.",
        ],
        "proposals": proposals,
    }

    DOCS_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    UI_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    DOCS_JSON_PATH.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    UI_JSON_PATH.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    DOCS_SVG_PATH.write_text(build_preview_svg(proposals), encoding="utf-8")

    print(f"Created {len(proposals)} hall map region proposals.")
    print(f"JSON: {DOCS_JSON_PATH.relative_to(REPO_ROOT)}")
    print(f"UI JSON: {UI_JSON_PATH.relative_to(REPO_ROOT)}")
    print(f"Preview SVG: {DOCS_SVG_PATH.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
