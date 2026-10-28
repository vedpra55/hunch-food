"""
Talk to a running Hunch API and print what the person would see, turn by turn.
  python scripts/talk.py --guest g1 "open" "I'm Amit" ...
  python scripts/talk.py --dev amit@test.in "spicy momos under 150"
Each argument is one turn ("open" starts onboarding). Costs one model turn per argument.
"""

import argparse
import json
import sys
import time

import httpx

ap = argparse.ArgumentParser()
ap.add_argument('turns', nargs='+')
ap.add_argument('--api', default='http://localhost:8000/api')
ap.add_argument('--guest')
ap.add_argument('--dev')
a = ap.parse_args()
headers = {'X-Guest-Id': a.guest} if a.guest else {'X-Dev-Email': a.dev}

total_in = total_out = 0
for turn in a.turns:
    body = {'event': 'open', 'text': ''} if turn == 'open' else {'text': turn}
    print(f'\n\033[1m> {turn}\033[0m')
    t0, first, text = time.monotonic(), None, ''
    with httpx.stream('POST', f'{a.api}/chat', json=body, headers=headers, timeout=120) as r:
        for line in r.iter_lines():
            if not line.startswith('data: '):
                continue
            ev = json.loads(line[6:])
            k = ev['type']
            if k == 'text':
                first = first or time.monotonic() - t0
                text += ev['delta']
            elif k == 'ack':
                print(f'  ack   {text.strip()}')
                text = ''
            elif k == 'step' and ev['status'] == 'done':
                print(f"  step  ✓ {ev['label']} · {ev.get('summary', '')}")
            elif k == 'component':
                c = ev['component']
                if c['kind'] == 'dishes':
                    desc = '; '.join(f"{d['name']} ({d['restaurant']}, ₹{d['price']}{', ' + d['offer'] if d['offer'] else ''}{'' if d['open'] else ', ' + d['opens']})" for d in c['items'])
                elif c['kind'] == 'restaurants':
                    desc = '; '.join(f"{x['name']} ({x['distance_km']} km{'' if x['delivers_here'] else ', out of reach'})" for x in c['items'])
                elif c['kind'] == 'choices':
                    desc = f"{c['question']} {c['options']}"
                elif c['kind'] in ('checkout', 'order'):
                    o = c['order']
                    desc = f"{o['restaurant']} ₹{o['total']} {o['stage']} → {o['address']}"
                elif c['kind'] == 'collect':
                    desc = f"needs {c['missing']}"
                else:
                    desc = c['kind']
                print(f"  show  [{c['kind']}] {desc}")
            elif k == 'cart':
                print(f"  cart  {ev['cart']['count']} items · ₹{ev['cart']['total']}")
            elif k == 'error':
                print(f"  ERROR {ev['message']}")
            elif k == 'done':
                u = ev.get('usage', {})
                total_in += u.get('in', 0)
                total_out += u.get('out', 0)
    print(f'  say   {text.strip()}')
    print(f"  ⏱ first words {first and round(first, 1)}s · total {round(time.monotonic() - t0, 1)}s · tokens in {u.get('in')} out {u.get('out')}")
print(f'\nTOTAL tokens in {total_in} out {total_out}')
