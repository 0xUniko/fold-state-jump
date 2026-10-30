#!/usr/bin/env python3
"""Build the state query matrix from the Clang inventory.

This is an audit artifact: every state-typed read/write/transfer/alias/return
event is a candidate source site, with its semantic identity and required query
modes.  Grouping across template/TU repetitions preserves the individual source
locations and instance identities.
"""
from __future__ import annotations

import json
import os
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "research" / "inventory" / "raw"
NANO = Path("/home/huawei/nano-infer")
OUT = ROOT / "research" / "inventory" / "state-query-matrix.json"
MD = ROOT / "research" / "inventory" / "state-query-matrix.md"

state_types = json.load(open(ROOT / "research/inventory/state-types.json"))
state_names = {r["record"]["name"] for r in state_types["stateTypes"]}
state_qualified = {r["record"]["qualified"] for r in state_types["stateTypes"]}
fold_inv = json.load(open(ROOT / "research/inventory/fold-inventory.json"))
oracle = [json.loads(x) for x in
          (ROOT / "research/oracle/nano-infer-oracle.jsonl").read_text().splitlines()
          if x.strip()]

fold_by_lambda = {}
fold_by_site = {}
for s in fold_inv["foldSourceSites"]:
    fold_by_site[(s["file"], s["line"])] = s
    for i in s["instances"]:
        fold_by_lambda[i["lambdaUsr"]] = s

oracle_sites = defaultdict(list)
for o in oracle:
    q = o["query"]
    oracle_sites[(q["file"], q["line"], q["column"])].append(o["id"])


def is_state_type(t: str) -> bool:
    if not t:
        return False
    return any(n and n in t for n in state_names) or any(q in t for q in state_qualified)


def role(e):
    k = e.get("event")
    sub = e.get("subkind", "")
    if k == "write":
        return "mutation/" + (sub or "write")
    if k == "call-effect":
        return "mutation/call-effect"
    if k == "method-mutation":
        return "mutation/method"
    if k == "alias":
        return "alias-binding"
    if k in {"move", "copy", "construct"}:
        return "value-transfer/" + k
    if k in {"return", "return-field"}:
        return "return/" + k
    if k == "fold-seed":
        return "fold-seed"
    if k in {"fold-result", "fold-result-value"}:
        return "fold-result"
    if k == "capture":
        return "capture/" + sub
    if k == "call":
        return "call"
    if k == "read":
        return "read/" + (sub or "read")
    return k or "unknown"


def modes(e):
    r = role(e)
    if r.startswith("mutation"):
        return ["mutation", "history"]
    if r.startswith("read"):
        return ["origin", "mutation"]
    if r in {"alias-binding", "fold-seed"}:
        return ["origin", "provenance"]
    if r.startswith("value-transfer") or r.startswith("return") or r == "fold-result":
        return ["provenance", "origin"]
    if r.startswith("capture"):
        return ["origin"]
    if r == "call":
        return ["provenance", "history"]
    return ["origin"]


rows = {}
for path in sorted(RAW.glob("*.ndjson")):
    tu = path.stem
    for line in path.open():
        try:
            r = json.loads(line)
        except json.JSONDecodeError:
            continue
        if r.get("kind") != "event":
            continue
        rt = r.get("rootType", "")
        ty = r.get("type", "")
        fn = r.get("fn", "")
        # Fold lambdas are always relevant even when the root type is deduced
        # or a scalar field.
        in_fold = fn in fold_by_lambda
        if not (is_state_type(rt) or is_state_type(ty) or in_fold):
            continue
        if not r.get("storage") and not in_fold:
            continue
        key = (r.get("file"), r.get("line"), r.get("col"), r.get("event"),
               r.get("subkind"), r.get("storage"))
        if key not in rows:
            site = fold_by_lambda.get(fn)
            relfile = (os.path.relpath(r["file"], NANO) if r.get("file") else "")
            oracle_ids = oracle_sites.get((relfile, r.get("line"), r.get("col")), [])
            rows[key] = {
                "siteId": "",
                "file": relfile,
                "line": r.get("line"),
                "column": r.get("col"),
                "anchor": r.get("expr"),
                "function": fn,
                "event": r.get("event"),
                "subkind": r.get("subkind"),
                "storage": r.get("storage"),
                "rootType": rt,
                "type": ty,
                "role": role(r),
                "requiredModes": modes(r),
                "expectedRelations": (
                    ["reaching-def", "write-kills-earlier"] if role(r).startswith("mutation/") else
                    ["value-source", "reaching-def"] if role(r).startswith("read/") else
                    ["reference-alias"] if role(r) == "alias-binding" else
                    ["fold-seed", "aggregate-field"] if role(r) == "fold-seed" else
                    ["fold-result", "fold-recurrence"] if role(r) == "fold-result" else
                    ["move-value-transfer"] if role(r) == "value-transfer/move" else
                    ["copy-value-transfer"] if role(r) == "value-transfer/copy" else
                    ["return-value"] if role(r).startswith("return/") else ["unclassified"]),
                "foldSite": (f"{site['file']}:{site['line']}" if site else ""),
                "oracleQueries": oracle_ids,
                "status": "oracle" if oracle_ids else ("fold-context" if site else "mechanical"),
                "boundaryHint": "dynamic-element" if ("[*:" in (r.get("storage") or "") or "[at:" in (r.get("storage") or "")) else
                                "pointer-or-external" if ("->*" in (r.get("storage") or "") or r.get("event") in {"call-effect", "method-mutation"}) else "",
                "instances": [],
            }
        rows[key]["instances"].append(tu)

matrix = sorted(rows.values(), key=lambda x: (x["file"], x["line"] or 0, x["column"] or 0, x["anchor"] or ""))
for i, r in enumerate(matrix, 1):
    r["siteId"] = f"state-site-{i:05d}"
    r["instances"] = sorted(set(r["instances"]))

counts = {
    "sites": len(matrix),
    "byStatus": dict(Counter(r["status"] for r in matrix)),
    "byRole": dict(Counter(r["role"] for r in matrix)),
    "byType": dict(Counter(r["rootType"] for r in matrix).most_common(20)),
}
OUT.write_text(json.dumps({"project": "nano-infer", "counts": counts,
                           "stateTypeNames": sorted(state_names),
                           "sites": matrix}, indent=2) + "\n")

lines = ["# State query matrix", "",
         f"Source sites: **{len(matrix)}**. This matrix is generated from the "
         "Clang event inventory, not from analyzer query results.", "",
         "## Counts", ""]
lines += ["| dimension | count |", "|---|---|"]
for k, v in counts["byStatus"].items():
    lines.append(f"| status:{k} | {v} |")
for k, v in sorted(counts["byRole"].items(), key=lambda kv: -kv[1]):
    lines.append(f"| role:{k} | {v} |")
lines += ["", "## Semantic coverage rules", "",
          "- A site is included when its root/expression type belongs to the "
          "47-record state-type closure, or it occurs in a fold lambda.",
          "- `oracle` means a reviewed Oracle query is anchored there.",
          "- `fold-context` means the site is in a fold lambda even if its type "
          "is scalar; it still needs seed/backedge interpretation.",
          "- `mechanical` sites have no independent Oracle yet; they are not "
          "counted as reviewed.",
          "- The full site list, including storage identity and modes, is in "
          "`state-query-matrix.json`.",
          "", "## Top root types", ""]
for k, v in counts["byType"].items():
    lines.append(f"- `{k}`: {v}")
MD.write_text("\n".join(lines) + "\n")
print(json.dumps(counts, indent=2))
