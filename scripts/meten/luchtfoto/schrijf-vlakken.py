# ASCEND: schrijft de vlakken uit maak-vlakken.py in src/integrations/aerialImagery.ts (const NL en const FR).
# Gebruik: python3 schrijf-vlakken.py <vlakken.json> src/integrations/aerialImagery.ts
import json, sys
rings = json.load(open(sys.argv[1])); target = sys.argv[2]
def fmt(ring):
    pts = [f'[{x}, {y}]' for x, y in ring]
    lines = []
    for i in range(0, len(pts), 8): lines.append('      ' + ', '.join(pts[i:i+8]) + ',')
    return '    [\n' + '\n'.join(lines) + '\n    ],'
def block(name):
    out = [f'const {name}: Area[] = [']
    for poly in rings[name]:
        out.append('  [')
        out += [fmt(r) for r in poly]
        out.append('  ],')
    out.append('];')
    return '\n'.join(out)
s = open(target).read()
for name in ['NL', 'FR']:
    start = s.index(f'const {name}: ')
    end = s.index('\n];\n', start) + 4
    s = s[:start] + block(name) + '\n' + s[end:]
open(target, 'w').write(s)
