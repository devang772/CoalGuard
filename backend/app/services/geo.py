"""Distances and mine-boundary checks."""
import math

from shapely.geometry import Point, shape
from shapely.ops import nearest_points

EARTH_RADIUS_M = 6_371_000


def distance_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle (haversine) distance in metres."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


def outside_distance_m(boundary: dict, lat: float, lng: float) -> float:
    """0 if the point is inside the GeoJSON polygon, else metres to its nearest edge."""
    polygon = shape(boundary)
    point = Point(lng, lat)                      # GeoJSON order: x = longitude, y = latitude
    if polygon.contains(point) or polygon.touches(point):
        return 0.0
    nearest = nearest_points(polygon.exterior, point)[0]
    return distance_m(lat, lng, nearest.y, nearest.x)


def format_distance(metres: float) -> str:
    return f"{metres / 1000:.1f} km" if metres >= 1000 else f"{round(metres)} m"
