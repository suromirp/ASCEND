# ASCEND: meet de landsvlakken na met echte tegels van PDOK (NL) en IGN (FR): ongeveer elke kilometer langs
# elke rand een tegel, en wit (meer dan de helft van de pixels rond het punt met alle kanalen boven 250) is fout.
# Gebruik: python3 meet-vlakken.py <vlakken.json> [zoom, standaard 15; 13 voor de hele rand]. Zie README.md.
import json, math, sys, io, urllib.request, time
from PIL import Image
rings = json.load(open(sys.argv[1]))
URL = {'NL': 'https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/Actueel_ortho25/EPSG:3857/{z}/{x}/{y}.jpeg',
       'FR': 'https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}'}
z = int(sys.argv[2]) if len(sys.argv) > 2 else 15
cache = {}
bad = []
n = 0
for name, polys in rings.items():
    for poly in polys:
        for ring in poly:
            pts = []
            for k in range(len(ring)):
                (x0, y0), (x1, y1) = ring[k], ring[(k + 1) % len(ring)]
                steps = max(1, int(math.hypot((x1 - x0) * 70, (y1 - y0) * 111)))  # ongeveer elke km
                pts += [(x0 + (x1 - x0) * t / steps, y0 + (y1 - y0) * t / steps) for t in range(steps)]
            for lon, lat in pts:
                n2 = 2 ** z
                fx = (lon + 180) / 360 * n2
                fy = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n2
                x, y = int(fx), int(fy)
                key = (name, x, y)
                if key not in cache:
                    try:
                        d = urllib.request.urlopen(URL[name].format(z=z, x=x, y=y), timeout=20).read()
                        cache[key] = Image.open(io.BytesIO(d)).convert('RGB')
                    except Exception as e:
                        cache[key] = None
                    time.sleep(0.03)
                im = cache[key]
                n += 1
                if im is None:
                    bad.append((name, lon, lat, 'fout')); continue
                px, py = int((fx - x) * 256), int((fy - y) * 256)
                box = [im.getpixel((min(255, max(0, px + dx)), min(255, max(0, py + dy)))) for dx in range(-8, 9, 2) for dy in range(-8, 9, 2)]
                white = sum(1 for c in box if min(c) >= 250) / len(box)
                if white > 0.5:
                    bad.append((name, lon, lat, round(white, 2)))
print('punten', n, 'wit of fout', len(bad))
for b in bad: print(b)
