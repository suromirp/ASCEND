# ASCEND: rekent de landsvlakken voor de luchtfoto uit (src/integrations/aerialImagery.ts, NL en FR).
# Gebruik: python3 maak-vlakken.py <ne_10m_admin_0_countries.geojson> <ne_10m_lakes.geojson> <uit.json>
# Bron: Natural Earth 1:10m (publiek domein). Uitgerekend in EPSG:3035 (meters). Zie README.md.
import json, sys
from shapely.geometry import shape, MultiPolygon
from shapely.ops import transform, unary_union
from pyproj import Transformer
src, lakes_src, out = sys.argv[1], sys.argv[2], sys.argv[3]
data = json.load(open(src))
by = {f['properties']['ADM0_A3']: shape(f['geometry']) for f in data['features']}
fwd = Transformer.from_crs(4326, 3035, always_xy=True).transform
back = Transformer.from_crs(3035, 4326, always_xy=True).transform
P = lambda g: transform(fwd, g)
def parts(g): return list(g.geoms) if isinstance(g, MultiPolygon) else [g]
# Frankrijk: het vasteland zonder meren (IGN is wit op het Meer van Genève), 4,5 km van elke grens en kust; vereenvoudigd binnen 1,5 km (dus minstens 3 km erin).
fra = max([p for p in parts(by['FRA']) if p.centroid.x > -6 and p.centroid.y > 41.5 and p.centroid.x < 9], key=lambda p: p.area)
lakes = json.load(open(lakes_src))
water = P(unary_union([shape(f['geometry']) for f in lakes['features'] if shape(f['geometry']).intersects(fra.envelope)]))
FR = P(fra).difference(water).buffer(-4500).simplify(1500)
# Nederland: het land met een zoom van 1,5 km (IJsselmeer, oostelijke Waddenzee en een strook zee: de laag
# van 25 cm dekt water; de westelijke Waddenzee blijft een gat), minus 2,9 km rond België en Duitsland;
# vereenvoudigd binnen 400 m, dus minstens 2,5 km van de landsgrens.
nld = P(unary_union([p for p in parts(by['NLD']) if p.centroid.y > 50]))
nb = P(unary_union([by['BEL'], by['DEU']])).buffer(2900)
NL = nld.buffer(9000).buffer(-7500).difference(nb).simplify(400)
res = {}
for name, g in [('NL', NL), ('FR', FR)]:
    rings = []
    for p in parts(g):
        if p.area < 4e7: continue  # kleiner dan 40 km2: weg
        ll = transform(back, p)
        rings.append([[[round(x, 3), round(y, 3)] for x, y in list(r.coords)[:-1]] for r in [ll.exterior, *ll.interiors]])
    res[name] = rings
    print(name, [[len(r) for r in poly] for poly in rings], file=sys.stderr)
json.dump(res, open(out, 'w'))
