"""Batch-generate event CGs with the OpenAI Images API (dev-only; needs OPENAI_API_KEY).

    uv run --with requests python -I scripts/gen-cgs.py art-src/cg/cgs.json [--only id1,id2] [--jobs 6]

cgs.json: [{"id": "cg_p1_petal_dive", "pigs": ["piggy-1"], "outfits": {"piggy-1": "volleyball"}, "bg": "plaza", "prompt": "Scene: ..."}]
Character reference sheets come from art-src/raw/refs/chars/<pig>[-<outfit>]-ref.png (portrait + full body).
Raw output goes to art-src/raw/cg/<id>.png; run `bun scripts/bake-backgrounds.ts <id>` to pixel-snap into public/assets/cg.
"""
import argparse, base64, json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor

import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STYLE = open(os.path.join(ROOT, 'art-src/cg/STYLE.txt')).read().strip()
ALT = {'piggy-1': 'volleyball', 'piggy-2': 'scrubs', 'piggy-3': 'hoodie'}
LOOKS = {
    'piggy-1': 'honey-blond tousled fringe, thick black brow-rim rectangular glasses',
    'piggy-2': 'chestnut spiky hair, thin silver rectangular glasses',
    'piggy-3': 'chocolate-brown curls, thin black round glasses',
}
CLOTHES = {
    ('piggy-1', 'everyday'): 'yellow tee and teal shorts', ('piggy-1', 'volleyball'): 'teal-and-white volleyball jersey, athletic shorts, navy knee pads',
    ('piggy-2', 'everyday'): 'blue tee and navy shorts', ('piggy-2', 'scrubs'): 'pale blue-gray V-neck surgical scrubs',
    ('piggy-3', 'everyday'): 'lavender tee and plum shorts', ('piggy-3', 'hoodie'): 'plain black hoodie and charcoal trousers',
}


def ref_path(pig: str, outfit: str) -> str:
    name = pig if outfit == 'everyday' else f'{pig}-{ALT[pig]}'
    return os.path.join(ROOT, 'art-src/raw/refs/chars', f'{name}-ref.png')


def build_prompt(cg: dict) -> str:
    pigs = cg.get('pigs', [])
    outfits = cg.get('outfits', {})
    cast = []
    for p in pigs:
        o = outfits.get(p, 'everyday')
        cast.append(f"{p.replace('-', ' ').title()}: {LOOKS[p]}, wearing {CLOTHES[(p, o)]}")
    count = {0: 'No pig characters', 1: 'Exactly one pig character', 2: 'Exactly two pig characters', 3: 'Exactly three pig characters'}[len(pigs)]
    cast_line = f"{count} (no duplicates, no extra pigs, no humans in the scene)" + (': ' + '; '.join(cast) + '.' if cast else '.')
    place = ("\nThe last reference image is the game's own painting of this location: match its architecture, palette and mood "
             "(recompose the camera freely for the shot).") if cg.get('bg') else ''
    return f"{STYLE}\n\nCast — {cast_line}{place}\n\n{cg['prompt'].strip()}\nAny signs, labels, screens or papers show only blank shapes or squiggles — no readable letters or numbers."


def generate(cg: dict, key: str, quality: str) -> str:
    out = os.path.join(ROOT, 'art-src/raw/cg', cg['id'] + '.png')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    prompt = build_prompt(cg)
    refs = [ref_path(p, cg.get('outfits', {}).get(p, 'everyday')) for p in cg.get('pigs', [])]
    if cg.get('bg'):  # the game's own painting of the place, so the CG matches the location
        refs.append(os.path.join(ROOT, 'art-src/raw/bg', cg['bg'] + '.png'))
    headers = {'Authorization': f'Bearer {key}'}
    for attempt in range(3):
        try:
            if refs:
                files = [('image[]', (os.path.basename(r), open(r, 'rb'), 'image/png')) for r in refs]
                data = {'model': 'gpt-image-2.5-sunburst', 'prompt': prompt, 'size': '1536x1024', 'quality': quality, 'n': '1'}
                r = requests.post('https://api.openai.com/v1/images/edits', headers=headers, data=data, files=files, timeout=600)
            else:
                body = {'model': 'gpt-image-2.5-sunburst', 'prompt': prompt, 'size': '1536x1024', 'quality': quality, 'n': 1}
                r = requests.post('https://api.openai.com/v1/images/generations', headers={**headers, 'Content-Type': 'application/json'}, data=json.dumps(body), timeout=600)
            if r.status_code == 200:
                open(out, 'wb').write(base64.b64decode(r.json()['data'][0]['b64_json']))
                return f"✓ {cg['id']}"
            msg = f"HTTP {r.status_code}: {r.text[:300]}"
        except requests.RequestException as e:
            msg = str(e)
    return f"✗ {cg['id']}: {msg}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('spec')
    ap.add_argument('--only', default='')
    ap.add_argument('--jobs', type=int, default=6)
    ap.add_argument('--quality', default='high')
    ap.add_argument('--skip-existing', action='store_true')
    a = ap.parse_args()
    key = os.environ.get('OPENAI_API_KEY')
    if not key:
        sys.exit('OPENAI_API_KEY is not set')
    cgs = json.load(open(a.spec))
    only = set(filter(None, a.only.split(',')))
    todo = [c for c in cgs if (not only or c['id'] in only)
            and not (a.skip_existing and os.path.exists(os.path.join(ROOT, 'art-src/raw/cg', c['id'] + '.png')))]
    with ThreadPoolExecutor(max_workers=a.jobs) as ex:
        for line in ex.map(lambda c: generate(c, key, a.quality), todo):
            print(line, flush=True)


if __name__ == '__main__':
    main()
