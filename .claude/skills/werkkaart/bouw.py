#!/usr/bin/env python3
"""Werkkaart van ASCEND: maakt werkkaart.json voor het dashboard (skill werkkaart).

Gebruik (vanuit de repo, op de nieuwste origin/main):
  python3 -I .claude/skills/werkkaart/bouw.py --repo . --stand <stand.json> --uit <werkkaart.json>

stand.json schrijft de coördinator zelf uit get_session en de GitHub-runs:
  {"bouwers": [{"naam": "Sherpa Klein", "model": "opus", "branch": "claude/x", "status": "bezig|review|herstel|klaar|vast", "wat": "..."}],
   "deploy": {"status": "groen|rood|bezig", "commit": "887aa8b"},
   "wachter": "aan|uit", "volgende": "12:40", "melding": "één zin voor de eigenaar of leeg"}
Geen persoonsgegevens: de repo is openbaar.
"""
import argparse, json, re, subprocess, datetime

def sectie(tekst, kop):
    m = re.search(r'^## ' + re.escape(kop) + r'.*?$\n(.*?)(?=^## )', tekst, re.S | re.M)
    if not m:
        return []
    items = []
    for regel in m.group(1).splitlines():
        if regel.startswith('- '):
            t = regel[2:].strip()
            titel = re.split(r'[:(]', t, maxsplit=1)[0].strip().rstrip('.')
            items.append({'titel': titel[:70], 'detail': t[:400]})
    return items

def main():
    a = argparse.ArgumentParser()
    a.add_argument('--repo', default='.')
    a.add_argument('--stand', required=True)
    a.add_argument('--uit', required=True)
    o = a.parse_args()
    stand = json.load(open(o.stand))
    backlog = open(f'{o.repo}/docs/backlog.md', encoding='utf-8').read()
    log = subprocess.run(['git', '-C', o.repo, 'log', 'origin/main', '-12', '--format=%h%x09%cI%x09%s'],
                         capture_output=True, text=True, check=True).stdout.strip().splitlines()
    rows = [{'id': 'ascend', 'label': 'ASCEND', 'groep': 'kern', 'ouder': '', 'status': '', 'detail': 'Train. Progress. Explore. Ascend.', 'wanneer': ''}]
    groepen = [('live', 'Live op main'), ('bouwen', 'Bouwers'), ('inbox', 'Inbox'), ('bouwrij', 'Bouwrij'), ('wacht', 'Wacht op jou')]
    for gid, naam in groepen:
        rows.append({'id': gid, 'label': naam, 'groep': gid, 'ouder': 'ascend', 'status': '', 'detail': '', 'wanneer': ''})
    for regel in log:
        sha, wanneer, titel = regel.split('\t', 2)
        rows.append({'id': 'c' + sha, 'label': titel[:60], 'groep': 'live', 'ouder': 'live', 'status': 'live', 'detail': f'{sha}: {titel}', 'wanneer': wanneer})
    for i, b in enumerate(stand.get('bouwers', [])):
        rows.append({'id': f'b{i}', 'label': b['naam'], 'groep': 'bouwen', 'ouder': 'bouwen', 'status': b.get('status', 'bezig'),
                     'detail': f"{b.get('wat', '')} ({b.get('model', '')}, {b.get('branch', '')})".strip(), 'wanneer': ''})
    for gid, kop in [('inbox', 'Inbox'), ('bouwrij', 'Bouwrij'), ('wacht', 'Wacht op de eigenaar')]:
        for j, it in enumerate(sectie(backlog, kop)):
            rows.append({'id': f'{gid}{j}', 'label': it['titel'], 'groep': gid, 'ouder': gid, 'status': 'wacht' if gid == 'wacht' else 'open', 'detail': it['detail'], 'wanneer': ''})
    reflectie = ''
    try:
        rt = open(f'{o.repo}/.claude/coordinator/reflectie.md', encoding='utf-8').read()
        blok = re.search(r'^## (.+?)$\n(.*?)(?=^## |\Z)', rt, re.S | re.M)
        if blok:
            reflectie = blok.group(1).strip() + '\n' + '\n'.join(l[2:] for l in blok.group(2).splitlines() if l.startswith('- '))
    except FileNotFoundError:
        pass
    nu = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat()
    bezig = [b for b in stand.get('bouwers', []) if b.get('status') != 'klaar']
    dep = stand.get('deploy', {})
    briefing = {'bijgewerkt': nu, 'bouwers': len(bezig), 'plekken': 3,
                'wacht': len([r for r in rows if r['groep'] == 'wacht' and r['ouder'] == 'wacht']),
                'deploy': dep.get('status', 'onbekend'), 'commit': dep.get('commit', ''),
                'laatst_live': log[0].split('\t', 2)[2] if log else '',
                'wachter': stand.get('wachter', 'onbekend'), 'volgende': stand.get('volgende', ''), 'melding': stand.get('melding', ''), 'reflectie': stand.get('reflectie', reflectie)}
    json.dump({'rows': rows, 'briefing': briefing,
               'meta': [{'label': 'Gemaakt door', 'value': '.claude/skills/werkkaart/bouw.py'}, {'label': 'Bijgewerkt', 'value': nu}]},
              open(o.uit, 'w'), ensure_ascii=False, indent=1)

if __name__ == '__main__':
    main()
