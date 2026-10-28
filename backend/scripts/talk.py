"""
Talk to a running Hunch API and print what the person would see, turn by turn.
  python scripts/talk.py --guest g1 --setup "Ved,phg-gt-road" "spicy momos under 150" "add the first one"
  python scripts/talk.py --dev amit@test.in "spicy momos under 150"
Each argument is one turn and costs one model turn. --setup does the first-run questions (free, no model).
"""

import argparse
import json
import time
import uuid

import httpx

ap = argparse.ArgumentParser()
ap.add_argument('turns', nargs='*')
ap.add_argument('--api', default='http://localhost:8000/api')
ap.add_argument('--guest')
ap.add_argument('--dev')
ap.add_argument('--setup', help='"Name,area-id" to finish onboarding first')
a = ap.parse_args()
headers = {'X-Guest-Id': a.guest} if a.guest else {'X-Dev-Email': a.dev}

if a.setup:
    name, area = a.setup.split(',')
    r = httpx.post(f'{a.api}/onboarding', json={'name': name, 'area_id': area, 'diet': 'nonveg', 'allergies': []}, headers=headers)
    print('setup', r.status_code, r.json().get('profile', r.json()).get('name'))


def describe(c: dict) -> str:
    k = c['kind']
    if k == 'dishes':
        return '; '.join(f"{d['name']} ({d['restaurant']}, ₹{d['price']}{', ' + d['offer'] if d['offer'] else ''}{'' if d['open'] else ', ' + d['opens']})" for d in c['items'])
    if k == 'restaurants':
        return '; '.join(f"{x['name']} ({x['distance_km']} km{'' if x['delivers_here'] else ', out of reach'})" for x in c['items'])
    if k == 'choices':
        return str(c['options'])
    if k in ('checkout', 'order'):
        o = c['order']
        return f"{o['restaurant']} ₹{o['total']} {o['stage']} → {o['address']}"
    if k == 'collect':
        return f"needs {c['missing']}"
    if k == 'menu':
        return c['restaurant']['name']
    return ''


total = {'in': 0, 'cached': 0, 'out': 0}
for turn in a.turns:
    print(f'\n\033[1m> {turn}\033[0m')
    t0, first, ack, u = time.monotonic(), None, '', {}
    with httpx.stream('POST', f'{a.api}/chat', json={'text': turn, 'turn_id': uuid.uuid4().hex}, headers=headers, timeout=120) as r:
        if r.status_code != 200:
            r.read()
            print('  HTTP', r.status_code, r.text)
            continue
        for line in r.iter_lines():
            if not line.startswith('data: '):
                continue
            ev = json.loads(line[6:])
            k = ev['type']
            first = first or time.monotonic() - t0
            if k == 'ack':
                ack += ev['delta']
            elif k == 'step' and ev['status'] == 'done':
                print(f"  step  ✓ {ev['label']} · {ev.get('summary', '')}")
            elif k == 'error':
                print(f"  ERROR {ev['message']}")
            elif k == 'done':
                m, u = ev['message'], ev.get('usage', {})
                for x in total:
                    total[x] += u.get(x, 0)
                if m['ack']:
                    print(f"  ack   {m['ack']}")
                print(f"  say   {m['text']}")
                for c in m['components']:
                    print(f"  show  [{c['kind']}] {describe(c)}")
    print(f"  ⏱ first event {first and round(first, 1)}s · total {round(time.monotonic() - t0, 1)}s · tokens {u}")
print(f'\nTOTAL tokens {total}')
