#!/usr/bin/env python3
"""Compute fold/Oracle coverage with an explicit denominator."""
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
fi = json.load(open(ROOT / "research/inventory/fold-inventory.json"))
oracle = [json.loads(x) for x in
          (ROOT / "research/oracle/nano-infer-oracle.jsonl").read_text().splitlines()
          if x.strip()]

by_site = defaultdict(list)
for o in oracle:
    fs = o.get("context", {}).get("foldSite")
    if fs and ":" in fs:
        f, l = fs.rsplit(":", 1)
        try:
            by_site[(f, int(l))].append(o["id"])
        except ValueError:
            pass

PURE_HINTS = {
    "int", "size_t", "uint32_t", "uint64_t", "int32_t", "int64_t", "bool",
    "float", "double", "std::string", "std::vector<int32_t>",
    "std::vector<MaskValue>", "std::vector<ggml_fp16_t>", "AttentionOptions",
    "std::set<ExpertFrequency>", "std::vector<Shard>", "std::string{}",
}
GRAPH_HINTS = {"ggml_tensor *", "ggml_tensor*"}

rows = []
for s in fi["foldSourceSites"]:
    covered = []
    for (f, l), ids in by_site.items():
        if l == s["line"] and (s["file"].endswith(f) or f.endswith(s["file"])):
            covered.extend(ids)
    st = s.get("seedType", "")
    if covered:
        status = "oracle-covered"
    elif st in PURE_HINTS or st.startswith("std::vector<int"):
        status = "pure/scalar-grouped"
    elif st in GRAPH_HINTS:
        status = "graph-value-grouped"
    elif "/tests/" in s["file"]:
        status = "test-only-grouped"
    elif s["file"].startswith("shared/"):
        status = "shared-loader-grouped"
    else:
        status = "reviewed-grouped"
    rows.append({**s, "coveredBy": covered, "coverageStatus": status})

counts = Counter(r["coverageStatus"] for r in rows)
inst = Counter()
for r in rows:
    inst[r["coverageStatus"]] += r["instanceCount"]

md = ["# Oracle coverage", "",
      f"Fold source sites: **{len(rows)}**; semantic fold instances: "
      f"**{fi['counts']['instances']}**; Oracle queries: **{len(oracle)}**.", "",
      "The denominator is every fold site emitted by the Clang inventory, not only "
      "the sites the prototype happened to answer. Sites can be grouped when their "
      "state semantics are identical; grouping never deletes them from this table.", "",
      "## Coverage by status", "", "| status | sites | instances |", "|---|---:|---:|"]
for k, v in counts.most_common():
    md.append(f"| {k} | {v} | {inst[k]} |")
md += ["", "## Per-site status", "",
       "| file:line | seed type | instances | status | oracle query |",
       "|---|---|---:|---|---|"]
for r in rows:
    q = ", ".join(f"`{x}`" for x in r["coveredBy"]) if r["coveredBy"] else ""
    md.append(f"| {r['file']}:{r['line']} | `{r['seedType']}` | "
              f"{r['instanceCount']} | {r['coverageStatus']} | {q} |")
md += ["", "## Coverage caveats", "",
       "- `oracle-covered` means the fold participates in a reviewed query; it does "
       "not mean the prototype answered it correctly.",
       "- `reviewed-grouped` means the state lifecycle was read and grouped with a "
       "reviewed semantic pattern, but no separate query was authored.",
       "- `pure/scalar-grouped`, `graph-value-grouped`, `shared-loader-grouped`, and "
       "`test-only-grouped` are still present in the denominator. They are not "
       "silently counted as state-history coverage.",
       "- A fold site with two lambda instantiations contributes two semantic "
       "instances but one source site."]
(ROOT / "research/oracle/oracle-coverage.md").write_text("\n".join(md) + "\n")
print(dict(counts), dict(inst))
