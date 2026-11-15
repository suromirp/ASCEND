#!/usr/bin/env python3
"""Werkkaart van ASCEND: maakt werkkaart.json voor het dashboard (skill werkkaart).

Gebruik (vanuit de repo, na git fetch origin):
  python3 -I .claude/skills/werkkaart/bouw.py --repo . --stand <stand.json> --uit <werkkaart.json>

Leest:
- .claude/coordinator/eigenaar.md: Vraag aan u, Stuk of vast, Net live.
- docs/backlog.md: de titels onder ## Inbox.
- git (origin/main en de branches van de bouwers): de laatste vijf op main, welke bestanden een bouwer wijzigt.
- docs/werkbriefjes/*.md en src/: de kaart van de app (onderwerpen, bestanden, imports).
- stand.json, door de uurtaak geschreven uit list_sessions en de laatste deploy:
  {"bouwers": [{"titel": "Sherpa StairMaster en wandelen in bpm",   # titel van de sessie
                "bucket": "working|completed|blocked|review_ready|failed",  # status_bucket zonder voorvoegsel
                "bijgewerkt": "2026-11-15T09:39:34Z",               # updated_at
                "samenvatting": "...",                              # post_turn_summary.recent_action, anders task_summary
                "vraag": "...",                                     # post_turn_summary.needs_action, of weglaten
                "branch": "claude/stairmaster-bpm"}],               # mag weg: dan uit de samenvatting gehaald
   "deploy": {"status": "groen|rood|bezig", "commit": "fe704a3"}}
  Alleen sessies met tag ascend:builder die niet gearchiveerd zijn.
Geen persoonsgegevens: de repo is openbaar.
"""
import argparse, datetime, json, os, re, subprocess, tempfile
from collections import Counter, defaultdict

def git(repo, *args, check=True, env=None):
    r = subprocess.run(['git', '-C', repo, *args], capture_output=True, text=True, env=env)
    if check and r.returncode != 0:
        raise RuntimeError(r.stderr.strip())
    return r.stdout

def blok(tekst, kop, niveau='## '):
    m = re.search(r'^' + re.escape(niveau + kop) + r'[^\n]*\n(.*?)(?=^## |\Z)', tekst, re.S | re.M)
    return m.group(1) if m else ''

def kaal(t):
    t = re.sub(r'`([^`]*)`', r'\1', t)
    t = re.sub(r'\*\*([^*]*)\*\*', r'\1', t)
    return t.replace('—', ',').replace('–', '-').strip()

# Eigenaar.md

def vragen(tekst):
    uit = []
    for m in re.finditer(r'^### (.+?)\n(.*?)(?=^### |\Z)', blok(tekst, 'Vraag aan u'), re.S | re.M):
        v = {'titel': kaal(m.group(1)), 'keuzes': '', 'zonder': '', 'sinds': ''}
        for regel in m.group(2).splitlines():
            r = re.match(r'- (Keuzes|Zonder antwoord|Sinds):\s*(.*)', regel.strip())
            if r:
                v[{'Keuzes': 'keuzes', 'Zonder antwoord': 'zonder', 'Sinds': 'sinds'}[r.group(1)]] = kaal(r.group(2))
        uit.append(v)
    return uit

def punten(tekst):
    return [kaal(l.strip()[2:]) for l in tekst.splitlines() if l.strip().startswith('- ')]

def net_live(tekst):
    uit = []
    for m in re.finditer(r'^### (.+?)\n(.*?)(?=^### |\Z)', blok(tekst, 'Net live'), re.S | re.M):
        for p in punten(m.group(2)):
            uit.append({'wanneer': kaal(m.group(1)), 'tekst': p})
    return uit

# Backlog

def inbox(backlog):
    uit = []
    for regel in blok(backlog, 'Inbox').splitlines():
        if regel.startswith('- '):
            t = re.sub(r'^\[I-\d+\]\s*', '', kaal(regel[2:]))
            titel = re.split(r'\s[(]|:\s', t, maxsplit=1)[0].strip().rstrip('.')
            uit.append({'titel': kort(titel, 80)})
    return uit

# Bouwers

def stap_van(b, live):
    if live:
        return 'live'
    return {'working': 'bouwen', 'blocked': 'vast', 'failed': 'vast'}.get(b.get('bucket', ''), 'controle')

def schoon(t):
    """Gewone taal: zonder commit-hashes, branchnamen en losse haakjes."""
    t = re.sub(r'\b(?:at|op|in|commit|commits)?\s*\b[0-9a-f]{7,40}\b', '', t or '', flags=re.I)
    t = re.sub(r'\s*(?:op|on|naar|to)?\s*claude/[A-Za-z0-9._-]+', '', t)
    t = re.sub(r'\(\s*[,;]?\s*\)', '', t)
    if t.count('(') != t.count(')'):
        t = t.replace('(', '').replace(')', '')
    t = re.sub(r'\s+([,.;])', r'\1', re.sub(r'\s{2,}', ' ', t))
    t = re.sub(r'([,;])\s*([,;.])', r'\2', t)
    return kaal(t).strip(' ,;')

def kort(t, n):
    return t if len(t) <= n else t[:n].rsplit(' ', 1)[0].rstrip(',;:') + '…'

def branch_bestanden(repo, branch):
    """Bestanden die de branch wijzigt en die nog anders zijn dan op main."""
    ref = 'origin/' + branch
    try:
        drie = set(git(repo, 'diff', '--name-only', 'origin/main...' + ref).split())
        twee = set(git(repo, 'diff', '--name-only', 'origin/main', ref).split())
    except RuntimeError:
        return None
    return sorted(drie & twee)

def al_op_main(repo, branch):
    """True als de wijzigingen van de branch al op main staan (squash): de patch past omgekeerd op main."""
    ref = 'origin/' + branch
    try:
        patch = git(repo, 'diff', '--binary', 'origin/main...' + ref)
    except RuntimeError:
        return False
    if not patch.strip():
        return True
    with tempfile.TemporaryDirectory() as d:
        env = dict(os.environ, GIT_INDEX_FILE=os.path.join(d, 'index'))
        git(repo, 'read-tree', 'origin/main', env=env)
        p = os.path.join(d, 'p.diff')
        open(p, 'w').write(patch)
        r = subprocess.run(['git', '-C', repo, 'apply', '--cached', '--check', '-R', p], capture_output=True, env=env)
        return r.returncode == 0

# Kaart van de app

def los_op(pad, alle):
    pad = pad.split('#', 1)[0].strip()
    if not re.search(r'\.(tsx?|css)$', pad):
        return None
    for kandidaat in (pad, 'src/' + pad):
        if kandidaat in alle:
            return kandidaat
    naam = pad.rsplit('/', 1)[-1]
    treffers = [f for f in alle if f.endswith('/' + naam)]
    return treffers[0] if len(treffers) == 1 else None

def imports(repo, alle):
    uit = []
    pat = re.compile(r'''(?:from|import)\s*\(?\s*['"](\.{1,2}/[^'"]+)['"]''')
    for f in alle:
        try:
            tekst = open(os.path.join(repo, f), encoding='utf-8').read()
        except OSError:
            continue
        basis = os.path.dirname(f)
        for spec in pat.findall(tekst):
            doel = os.path.normpath(os.path.join(basis, spec))
            doel = re.sub(r'\.js$', '', doel)
            for k in (doel, doel + '.ts', doel + '.tsx', doel + '/index.ts', doel + '/index.tsx'):
                if k in alle:
                    uit.append((f, k))
                    break
    return uit

def kaart(repo):
    alle = set(l for l in git(repo, 'ls-files', 'src').split() if re.search(r'\.tsx?$', l) and not re.search(r'\.test\.tsx?$', l))
    onderwerpen, bestand_van = [], defaultdict(set)
    map_ = os.path.join(repo, 'docs/werkbriefjes')
    for naam in sorted(os.listdir(map_)):
        if not naam.endswith('.md') or naam == 'README.md':
            continue
        oid = naam[:-3]
        tekst = open(os.path.join(map_, naam), encoding='utf-8').read()
        titel = re.search(r'^# (.+)$', tekst, re.M)
        zin = tekst.split('\n\n', 2)[1].strip() if tekst.count('\n\n') >= 2 else ''
        bestanden = set()
        for pad in re.findall(r'`([^`\s]+)`', blok(tekst, 'Bestanden')):
            f = los_op(pad, alle)
            if f:
                bestanden.add(f)
        for f in bestanden:
            bestand_van[f].add(oid)
        onderwerpen.append({'id': oid, 'label': kaal(titel.group(1)) if titel else oid, 'zin': kaal(zin)[:220], 'bestanden': len(bestanden)})
    tel = Counter()
    for a, b in imports(repo, alle):
        for x in bestand_van.get(a, ()):
            for y in bestand_van.get(b, ()):
                if x != y:
                    tel[tuple(sorted((x, y)))] += 1
    lijnen = [{'van': a, 'naar': b, 'imports': n} for (a, b), n in sorted(tel.items(), key=lambda kv: -kv[1])]
    bestanden = [{'pad': f, 'naam': f.rsplit('/', 1)[-1], 'onderwerp': sorted(o)[0], 'ook': sorted(o)[1:]} for f, o in sorted(bestand_van.items())]
    return onderwerpen, lijnen, bestanden, bestand_van

def main():
    a = argparse.ArgumentParser()
    a.add_argument('--repo', default='.')
    a.add_argument('--stand', required=True)
    a.add_argument('--uit', required=True)
    o = a.parse_args()
    repo = o.repo
    stand = json.load(open(o.stand, encoding='utf-8'))
    eig = open(os.path.join(repo, '.claude/coordinator/eigenaar.md'), encoding='utf-8').read()
    backlog = open(os.path.join(repo, 'docs/backlog.md'), encoding='utf-8').read()
    nu = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)

    onderwerpen, lijnen, bestanden, bestand_van = kaart(repo)

    bouwers, stuk = [], []
    for b in stand.get('bouwers', []):
        titel = b.get('titel', '')
        rol, _, wat = titel.partition(' ')
        if rol not in ('Sherpa', 'Scout', 'Warden', 'Lookout', 'Cartographer', 'Pathfinder'):
            rol, wat = '', titel
        branch = b.get('branch') or ''
        if not branch:
            m = re.search(r'claude/[A-Za-z0-9._-]+', (b.get('samenvatting') or '') + ' ' + (b.get('vraag') or ''))
            branch = m.group(0).rstrip('.,;)') if m else ''
        files = branch_bestanden(repo, branch) if branch else None
        live = bool(branch) and b.get('bucket') != 'working' and files is not None and al_op_main(repo, branch)
        stap = stap_van(b, live)
        try:
            t = datetime.datetime.fromisoformat(b.get('bijgewerkt', '').replace('Z', '+00:00'))
            stil_uren = (nu - t).total_seconds() / 3600
        except ValueError:
            t, stil_uren = None, 0
        raakt = sorted({oid for f in (files or []) for oid in bestand_van.get(f, ())})
        rij = {'id': re.sub(r'[^a-z0-9]+', '-', titel.lower()).strip('-')[:60] or 'bouwer', 'wat': wat[:1].upper() + wat[1:], 'rol': rol,
               'stap': stap, 'stand': kort(schoon(b.get('samenvatting')), 280), 'vraag': kort(schoon(b.get('vraag')), 200),
               'bijgewerkt': t.isoformat() if t else '', 'branch': branch, 'raakt': raakt,
               'bestanden': [f for f in (files or []) if f in bestand_van]}
        bouwers.append(rij)
        if b.get('bucket') == 'failed':
            stuk.append({'tekst': f'{rij["wat"]}: de bouwer faalde.', 'soort': 'rood', 'auto': True})
        elif b.get('bucket') == 'working' and stil_uren > 2:
            stuk.append({'tekst': f'{rij["wat"]}: al {int(stil_uren)} uur geen teken van leven.', 'soort': 'rood', 'auto': True})
        elif b.get('bucket') == 'blocked' or rij['vraag']:
            stuk.append({'tekst': f'{rij["wat"]}: wacht. {rij["vraag"]}'.strip(), 'soort': 'amber', 'auto': True})
    dep = stand.get('deploy', {})
    if dep.get('status') == 'rood':
        stuk.insert(0, {'tekst': 'De laatste deploy op main is rood: de app online is niet bijgewerkt.', 'soort': 'rood', 'auto': True})
    for p in punten(blok(eig, 'Stuk of vast')):
        stuk.append({'tekst': p, 'soort': 'rood', 'auto': False})

    log = git(repo, 'log', 'origin/main', '-5', '--format=%h%x09%cI%x09%s').strip().splitlines()
    op_main = [{'id': r.split('\t')[0], 'wanneer': r.split('\t')[1], 'tekst': kort(kaal(r.split('\t', 2)[2]), 110)} for r in log]

    def kaartje(titel, kolom, extra=''):
        return {'id': re.sub(r'[^a-z0-9]+', '-', (kolom + '-' + titel).lower())[:70], 'kolom': kolom, 'titel': titel, 'extra': extra}
    stroom = [kaartje(i['titel'], 'inbox') for i in inbox(backlog)]
    stroom += [kaartje(b['wat'], 'bouwen', b['rol']) for b in bouwers if b['stap'] in ('bouwen', 'vast')]
    stroom += [kaartje(b['wat'], 'controle', b['rol']) for b in bouwers if b['stap'] == 'controle']
    stroom += [kaartje(c['tekst'], 'live', c['wanneer']) for c in op_main]

    actief = defaultdict(list)
    for b in bouwers:
        if b['stap'] in ('bouwen', 'controle', 'vast'):
            for oid in b['raakt']:
                actief[oid].append({'wat': b['wat'], 'stap': b['stap']})
    for ow in onderwerpen:
        ow['bouwers'] = actief.get(ow['id'], [])

    vr = vragen(eig)
    briefing = {'bijgewerkt': nu.isoformat(), 'vragen': len(vr), 'stuk': len([s for s in stuk if s['soort'] == 'rood']),
                'amber': len([s for s in stuk if s['soort'] == 'amber']),
                'bouwen': len([b for b in bouwers if b['stap'] == 'bouwen']), 'controle': len([b for b in bouwers if b['stap'] == 'controle']),
                'inbox': len([s for s in stroom if s['kolom'] == 'inbox']), 'deploy': dep.get('status', 'onbekend'), 'commit': dep.get('commit', ''),
                'onderwerpen': len(onderwerpen), 'lijnen': len(lijnen), 'bestanden': len(bestanden)}
    uit = {'briefing': briefing, 'vragen': vr, 'stuk': stuk, 'bouwers': bouwers, 'net_live': net_live(eig),
           'stroom': stroom, 'onderwerpen': onderwerpen, 'lijnen': lijnen, 'bestanden': bestanden,
           'meta': [{'label': 'Gemaakt door', 'value': '.claude/skills/werkkaart/bouw.py'}, {'label': 'Bijgewerkt', 'value': nu.isoformat()}]}
    json.dump(uit, open(o.uit, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

if __name__ == '__main__':
    main()
