#!/usr/bin/env python3
"""Aggregate ast-inventory NDJSON into auditable research inventories.

This is a deterministic transformation of Clang AST/CFG output.  It does not
consult the old fold-state-jump analyzer, and it never invents a target.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "research" / "inventory" / "raw"
OUT = ROOT / "research" / "inventory"
NANO = Path("/home/huawei/nano-infer")

STATE_ROOTS = [
    "SessionState", "BatchState", "LayerExecution", "Generation", "BankState",
    "SlotState", "LesCounters", "PhaseCounters", "PendingPrefetch",
    "PrefillPlan", "Planning", "SharedDecodePlan", "CacheDecodePlan",
    "AttentionState", "AttentionCaches", "PrefillState", "BatchResult",
    "CompressionStatePlan", "CompressionStateTensors", "AttentionGraph",
    "BankContext", "GraphCache", "LanguageGraphs", "LayerGraphs",
    "ExpertBank", "ReadCompletion", "IoTicket", "Warming", "Prewarming",
]


def load_ndjson(path: Path):
    with path.open() as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                # A failed frontend action can leave a truncated final record.
                continue


def rel(p: str) -> str:
    import os
    try:
        return os.path.relpath(Path(p).resolve(), NANO)
    except Exception:
        return p


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def strip_type(t: str) -> list[str]:
    """Extract candidate record names from a C++ type string."""
    names = re.findall(r'(?:[A-Za-z_]\w*::)*[A-Za-z_]\w*', t)
    skip = {
        "const", "volatile", "std", "vector", "map", "set", "unordered_map",
        "unordered_set", "optional", "variant", "array", "pair", "tuple",
        "unique_ptr", "shared_ptr", "weak_ptr", "future", "promise",
        "string", "function", "reference_wrapper", "span", "size_t", "int",
        "uint32_t", "uint64_t", "int32_t", "int64_t", "bool", "char", "float",
        "double", "void", "auto", "allocator", "less", "thread", "mutex",
    }
    out = []
    for n in names:
        short = n.split("::")[-1]
        if short not in skip and not short[0].isdigit():
            out.append(n)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("raw", nargs="*", type=Path)
    args = ap.parse_args()
    files = args.raw or sorted(RAW.glob("*.ndjson"))

    records = {}
    functions = {}
    folds = {}
    events = {}
    cfgs = {}
    files_seen = set()
    per_tu = {}

    for path in files:
        tu = path.stem
        counts = Counter()
        for rec in load_ndjson(path):
            kind = rec.get("kind")
            counts[kind] += 1
            if kind == "record":
                u = rec.get("usr")
                if u and u not in records:
                    records[u] = rec
                if rec.get("file"):
                    files_seen.add(rec["file"])
            elif kind == "function":
                u = rec.get("usr")
                if u and u not in functions:
                    functions[u] = {**rec, "observedIn": [tu]}
                elif u:
                    functions[u].setdefault("observedIn", []).append(tu)
                if rec.get("file"):
                    files_seen.add(rec["file"])
            elif kind == "fold":
                key = (rec.get("fn"), rec.get("seedOffset"), rec.get("lambdaUsr"),
                       rec.get("line"), rec.get("col"))
                if key not in folds:
                    folds[key] = {**rec, "tuInstances": [tu]}
                else:
                    folds[key]["tuInstances"].append(tu)
                if rec.get("file"):
                    files_seen.add(rec["file"])
            elif kind == "event":
                key = (rec.get("fn"), rec.get("id"))
                if key not in events:
                    events[key] = {**rec, "tu": tu}
            elif kind == "cfg-block":
                key = (rec.get("fn"), rec.get("id"))
                cfgs[key] = {**rec, "tu": tu}
        per_tu[tu] = dict(counts)

    # Collapse identical fold instances that differ only by TU repetition.
    fold_instances = list(folds.values())
    by_site = defaultdict(list)
    for f in fold_instances:
        by_site[(rel(f.get("file", "")), f.get("line"), f.get("col"))].append(f)
    fold_sites = []
    for i, ((file, line, col), insts) in enumerate(sorted(by_site.items()), 1):
        # Deduplicate by lambda identity; pattern and instantiated lambdas are
        # different semantic instances and are kept.
        uniq = {}
        for f in insts:
            uniq[(f.get("lambdaUsr"), f.get("fn"))] = f
        insts = list(uniq.values())
        first = insts[0]
        fold_sites.append({
            "siteId": f"fold-site-{i:03d}",
            "file": file,
            "line": line,
            "col": col,
            "api": first.get("api"),
            "seedText": first.get("seedText"),
            "seedType": first.get("seedType"),
            "seedOffset": first.get("seedOffset"),
            "seedLine": first.get("seedLine"),
            "seedCol": first.get("seedCol"),
            "callText": first.get("callText"),
            "destStorage": first.get("destStorage"),
            "instances": [{
                "fn": f.get("fn"),
                "lambdaUsr": f.get("lambdaUsr"),
                "api": f.get("api"),
                "destStorage": f.get("destStorage"),
                "tuInstances": sorted(set(f.get("tuInstances", []))),
            } for f in insts],
            "instanceCount": len(insts),
        })

    # Record closure from curated state roots.
    name_to_records = defaultdict(list)
    for u, r in records.items():
        name_to_records[r.get("qualified", r.get("name", ""))].append(u)
    state_roots = []
    for u, r in records.items():
        q = r.get("qualified", "")
        if any(q == x or q.endswith("::" + x) or x in q.split("::") for x in STATE_ROOTS):
            state_roots.append(u)
    state_types = set(state_roots)
    queue = list(state_roots)
    while queue:
        u = queue.pop()
        r = records.get(u)
        if not r:
            continue
        for f in r.get("fields", []):
            for cand in strip_type(f.get("type", "")):
                for nu in name_to_records.get(cand, []):
                    if nu not in state_types:
                        state_types.add(nu)
                        queue.append(nu)

    # Events summarized by function / line.
    event_list = list(events.values())
    transfer_events = [
        e for e in event_list
        if e.get("event") in {
            "alias", "move", "copy", "capture", "call-effect", "return",
            "return-field", "fold-seed", "fold-result", "fold-result-value",
            "ctor-init",
        }
    ]
    write_events = [e for e in event_list if e.get("event") == "write"]

    # Query sites generated from fold structure.  Each site is a candidate for
    # an independent Oracle entry; the Oracle itself is authored separately.
    query_sites = []
    qid = 0
    for fs in fold_sites:
        fns = {i["fn"] for i in fs["instances"]}
        lambdas = {i["lambdaUsr"] for i in fs["instances"]}
        seed_evts = [e for e in event_list
                     if e.get("event") == "fold-seed"
                     and e.get("fn") in fns
                     and e.get("line") == fs.get("seedLine")]
        # Seed events may be attributed to the lambda param; identify by value
        # location within the seed text.
        seed_lo = fs.get("seedOffset") or 0
        seed_evts = [e for e in seed_evts
                     if e.get("offset", 0) >= seed_lo]
        for e in seed_evts:
            qid += 1
            query_sites.append({
                "queryId": f"q-{qid:04d}",
                "foldSite": fs["siteId"],
                "role": "fold-seed-field",
                "file": rel(e.get("file", "")),
                "line": e.get("line"), "col": e.get("col"),
                "anchor": e.get("expr"),
                "statePath": e.get("storage"),
                "valueSource": e.get("value"),
                "suggestedModes": ["origin", "provenance"],
            })
        for e in event_list:
            if e.get("fn") not in lambdas:
                continue
            root = e.get("root") or ""
            if not any(root.endswith(i.get("lambdaUsr", "")) or
                       root.endswith(i.get("lambdaUsr", "").split("@")[-1])
                       for i in fs["instances"]):
                # Accept parameter roots; their USR embeds the lambda USR.
                pass
            if e.get("event") == "read" and (e.get("subkind") in
                                              {"member", "dependent-member",
                                               "unresolved-member", "declref"}):
                if root and ("operator()" in root or "@Sa@F@operator()" in root):
                    qid += 1
                    query_sites.append({
                        "queryId": f"q-{qid:04d}",
                        "foldSite": fs["siteId"],
                        "role": "fold-lambda-read",
                        "file": rel(e.get("file", "")),
                        "line": e.get("line"), "col": e.get("col"),
                        "anchor": e.get("expr"),
                        "statePath": e.get("storage"),
                        "suggestedModes": ["origin", "mutation", "history"],
                    })
            if e.get("event") == "write" and e.get("subkind") in {
                "assign", "increment", "compound", "init", "method-mutation",
                "call-effect",
            }:
                qid += 1
                query_sites.append({
                    "queryId": f"q-{qid:04d}",
                    "foldSite": fs["siteId"],
                    "role": "fold-lambda-write",
                    "file": rel(e.get("file", "")),
                    "line": e.get("line"), "col": e.get("col"),
                    "anchor": e.get("expr"),
                    "statePath": e.get("storage"),
                    "suggestedModes": ["mutation", "history"],
                })
            if e.get("event") == "alias":
                qid += 1
                query_sites.append({
                    "queryId": f"q-{qid:04d}",
                    "foldSite": fs["siteId"],
                    "role": "fold-lambda-alias",
                    "file": rel(e.get("file", "")),
                    "line": e.get("line"), "col": e.get("col"),
                    "anchor": e.get("expr"),
                    "statePath": e.get("storage"),
                    "valueSource": e.get("value"),
                    "suggestedModes": ["origin"],
                })

    source_inventory = {
        "project": "nano-infer",
        "sourceRevision": "2e523d9e1d6c198988cab4193971093907f767f5",
        "worktreeDirty": True,
        "translationUnits": [{"tu": k, "records": v} for k, v in sorted(per_tu.items())],
        "files": sorted(rel(f) for f in files_seen),
        "counts": {
            "translationUnits": len(files),
            "files": len(files_seen),
            "functions": len(functions),
            "functionTemplateInstances": sum(
                1 for f in functions.values() if f.get("isTemplateInstantiation")),
            "lambdaFunctions": sum(1 for f in functions.values() if f.get("isLambda")),
            "records": len(records),
            "foldInstances": sum(len(f["instances"]) for f in fold_sites),
            "foldSourceSites": len(fold_sites),
            "events": len(events),
            "writes": len(write_events),
            "transfers": len(transfer_events),
            "stateRecords": len(state_types),
        },
        "sourceHashes": {
            rel(f): sha256_file(Path(f))
            for f in sorted(files_seen) if Path(f).exists()
        },
        "methods": [
            "Clang 23 LibTooling AST + CFG; no regular-expression inventory",
            "Template pattern and implicit instantiation functions are distinct USRs",
            "Dependent member expressions are recorded as field paths",
        ],
    }

    (OUT / "source-inventory.json").write_text(json.dumps(source_inventory, indent=2) + "\n")
    (OUT / "fold-inventory.json").write_text(json.dumps({
        "project": "nano-infer",
        "sourceRevision": source_inventory["sourceRevision"],
        "foldSourceSites": fold_sites,
        "counts": {"sites": len(fold_sites),
                   "instances": sum(len(f["instances"]) for f in fold_sites)},
    }, indent=2) + "\n")
    (OUT / "state-types.json").write_text(json.dumps({
        "project": "nano-infer",
        "roots": sorted(STATE_ROOTS),
        "stateTypes": [
            {"usr": u, "record": records[u],
             "root": records[u].get("qualified") in STATE_ROOTS}
            for u in sorted(state_types) if u in records
        ],
        "count": len(state_types),
    }, indent=2) + "\n")
    (OUT / "state-transfers.json").write_text(json.dumps({
        "project": "nano-infer",
        "events": transfer_events,
        "count": len(transfer_events),
    }, indent=2) + "\n")
    (OUT / "query-sites.json").write_text(json.dumps({
        "project": "nano-infer",
        "querySites": query_sites,
        "count": len(query_sites),
        "byRole": dict(Counter(q["role"] for q in query_sites)),
    }, indent=2) + "\n")

    print(json.dumps(source_inventory["counts"], indent=2))
    print("fold sites", len(fold_sites), "query sites", len(query_sites),
          "state records", len(state_types))


if __name__ == "__main__":
    main()
