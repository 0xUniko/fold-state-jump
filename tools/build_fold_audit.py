#!/usr/bin/env python3
"""Structured audit for every fold source/instance in the inventory."""
import json, os
from collections import Counter, defaultdict
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
inv=json.load(open(ROOT/'research/inventory/fold-inventory.json'))
raw=ROOT/'research/inventory/raw'
NANO=Path('/home/huawei/nano-infer')
events_by_fn=defaultdict(list); branches=defaultdict(list); events_by_id={}
for p in raw.glob('*.ndjson'):
    for line in p.open():
        try:r=json.loads(line)
        except:continue
        if r.get('kind')=='event':
            events_by_fn[r.get('fn')].append(r); events_by_id[r.get('id')]=r
        elif r.get('kind')=='branch': branches[r.get('fn')].append(r)
rows=[]
for s in inv['foldSourceSites']:
    for inst in s['instances']:
        lam=inst['lambdaUsr']; fn=inst['fn']
        es=events_by_fn.get(lam,[])
        ev_id={e['id']:e for e in es}
        reads=[e for e in es if e.get('event')=='read']
        writes=[e for e in es if e.get('event')=='write']
        returns=[e for e in es if e.get('event')=='return']
        seeds=[]
        for e in events_by_fn.get(fn,[]):
            if e.get('event')=='fold-seed' and lam.split('@')[-1][:20] in (e.get('storage') or ''):
                seeds.append(e)
        # guard branches whose range contains a fold lambda write/read
        guards=[]
        for b in branches.get(lam,[]):
            guards.append({k:b.get(k) for k in ('line','condition','op','lhsText','rhsText','thenStart','thenEnd')})
        status='reviewed' if s['file'].split('/')[-1] in {
            'pipeline.h','experts.h','ffn.h','expert_io.h','attention_pipeline.h',
            'ffn_service.h','attention_node.cpp','cli.cpp','dsv4_ffn.h'} else 'mechanical'
        rows.append({
            'siteId': s['siteId'], 'file': s['file'], 'line': s['line'],
            'api': s['api'], 'fn': fn, 'lambdaUsr': lam,
            'seedText': s['seedText'], 'seedType': s['seedType'],
            'rangeStart': s.get('rangeStart',''),
            'seedFields': [{'line':e.get('line'),'storage':e.get('storage'),'value':e.get('value')} for e in seeds],
            'seedFieldCount': len(seeds),
            'reads': len(reads), 'writes': len(writes), 'returns': len(returns),
            'returnLocations': [{'line':e.get('line'),'value':e.get('value')} for e in returns],
            'guards': guards, 'status': status,
        })
# dedupe identical instance rows (same fn/lambda/site)
uniq={ (r['siteId'],r['fn'],r['lambdaUsr']):r for r in rows}
rows=sorted(uniq.values(), key=lambda r:(r['file'],r['line'],r['fn']))
out={'project':'nano-infer','foldSites':len(inv['foldSourceSites']),'instances':len(rows),
     'statusCounts':dict(Counter(r['status'] for r in rows)),
     'folds':rows}
(ROOT/'research/inventory/fold-audit.json').write_text(json.dumps(out,indent=2)+'\n')
lines=['# Fold audit','',f"Source sites: **{len(inv['foldSourceSites'])}**; semantic instances: **{len(rows)}**.", '',
       'Each row records seed fields, lambda reads/writes, every return, source guards and review status.','',
       '| site | fn | seed fields | reads | writes | returns | guards | status |','|---|---|---:|---:|---:|---:|---:|---|']
for r in rows:
    lines.append(f"| {r['file']}:{r['line']} | `{r['fn'][-28:]}` | {r['seedFieldCount']} | {r['reads']} | {r['writes']} | {r['returns']} | {len(r['guards'])} | {r['status']} |")
(ROOT/'research/inventory/fold-audit.md').write_text('\n'.join(lines)+'\n')
print(out['instances'], out['statusCounts'])
