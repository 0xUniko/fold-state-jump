#!/usr/bin/env python3
"""Run the independent Oracle against state_trace and report honest outcomes."""
from __future__ import annotations

import json
import os
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NANO = Path("/home/huawei/nano-infer")
sys.path.insert(0, str(ROOT / "prototype" / "src"))
from state_trace import Program, Tracer, choose_tu  # noqa: E402

ORACLE = ROOT / "research" / "oracle" / "nano-infer-oracle.jsonl"
OUT = ROOT / "research" / "measurements" / "oracle-run.json"
REPORT = ROOT / "research" / "reports" / "correctness-results.md"


def tu_for(file: str) -> str:
    if "attention_pipeline" in file or "attention_node" in file:
        return "deepseek-v4-flash_attention_node"
    if "ffn_service" in file or "dsv4_ffn" in file:
        return "deepseek-v4-flash_ffn_node"
    if "model_loader" in file:
        return "shared_model_loader"
    if "tests/" in file:
        return "minicpm-v-4_7_tests_local_test"
    return "minicpm-v-4_7_cli"


def target_matches(t, expected):
    if os.path.basename(t["file"]) != os.path.basename(expected["file"]):
        return False
    if t["line"] != expected["line"]:
        return False
    # The anchor check prevents matching an unrelated expression on the same line.
    a = expected.get("anchor", "")
    x = t.get("expr", "")
    if a and a not in x and x not in a:
        # Accept a nearby source-level anchor on the same line (e.g. declaration
        # versus initializer) only when the expectation says it is optional.
        return False
    return True


def main():
    entries = [json.loads(x) for x in ORACLE.read_text().splitlines() if x.strip()]
    progs = {}
    results = []
    for entry in entries:
        q = entry["query"]
        file = str(NANO / q["file"])
        tu = tu_for(q["file"])
        if tu not in progs:
            progs[tu] = Program(ROOT / "research" / "inventory" / "raw" / f"{tu}.ndjson")
        p = progs[tu]
        e = p.resolve_site(file, q["line"], q["column"])
        rec = {"id": entry["id"], "expectedKind": entry["expectation"]["kind"],
               "query": q}
        if not e:
            rec.update({"status": "no-site", "actualKind": "None", "targets": [],
                        "boundaries": []})
            results.append(rec)
            continue
        tr = Tracer(p)
        try:
            tr.run(e, q["mode"])
            out = tr.result(e, q["mode"])
        except Exception as exc:  # keep the run reproducible even on a prototype bug
            rec.update({"status": "analyzer-error", "error": repr(exc),
                        "actualKind": "None", "targets": [], "boundaries": []})
            results.append(rec)
            continue
        actual = out["targets"]
        expected_required = [t for t in entry["expectation"]["targets"]
                             if t.get("required", True)]
        matched = []
        for exp in expected_required:
            hit = next((a for a in actual if target_matches(a, exp)), None)
            if hit:
                matched.append(exp)
        missing = [x for x in expected_required if x not in matched]
        actual_non_selected = [a for a in actual if a["kind"] != "selected"]
        expected_kind = entry["expectation"]["kind"]
        actual_kind = out["expectationKind"]
        status = "mismatch"
        if expected_kind in {"Boundary", "Unsupported"}:
            if actual_kind in {"Boundary", "Unsupported"} or out["boundaries"]:
                status = "correct-boundary" if expected_kind == "Boundary" else "unsupported-observed"
        elif expected_kind == "NoPriorMutation":
            if actual_kind == "NoPriorMutation":
                status = "correct-no-prior"
        elif expected_kind == "Exact":
            if actual_kind == "Exact" and not missing:
                status = "correct-exact"
            elif not missing:
                status = "targets-found-kind-mismatch"
        elif expected_kind == "Multiple":
            if actual_kind in {"Multiple", "Conditional"} and not missing:
                status = "correct-multiple"
        elif expected_kind == "Conditional":
            if actual_kind in {"Conditional", "Multiple", "Boundary"} and matched:
                status = "correct-conditional"
        rec.update({
            "status": status,
            "actualKind": actual_kind,
            "matchedRequiredTargets": len(matched),
            "requiredTargets": len(expected_required),
            "missingTargets": missing,
            "actualTargets": actual,
            "boundaries": out["boundaries"],
            "provenance": out["provenance"],
        })
        results.append(rec)

    counts = Counter(r["status"] for r in results)
    by_expected = Counter(r["expectedKind"] for r in results)
    by_actual = Counter(r["actualKind"] for r in results)
    target_hits = sum(r.get("matchedRequiredTargets", 0) for r in results)
    target_total = sum(r.get("requiredTargets", 0) for r in results)
    target_precision_den = sum(len([a for a in r.get("actualTargets", [])
                                    if a["kind"] != "selected"]) for r in results)
    # Count an actual non-selected target as a true positive when it matches any
    # expected target (required or optional), otherwise it is extra.
    tp = 0
    for r, entry in zip(results, entries):
        expected_all = entry["expectation"]["targets"]
        for a in r.get("actualTargets", []):
            if a["kind"] == "selected":
                continue
            if any(target_matches(a, x) for x in expected_all):
                tp += 1
    report = {
        "entries": len(entries),
        "statusCounts": dict(counts),
        "expectedKindCounts": dict(by_expected),
        "actualKindCounts": dict(by_actual),
        "requiredTargetRecall": f"{target_hits}/{target_total}",
        "actualTargetPrecision": f"{tp}/{target_precision_den}",
        "results": results,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2) + "\n")

    lines = ["# Correctness results: independent Oracle run", "",
             f"Oracle entries: {len(entries)}", "",
             "## Outcome counts", "", "| outcome | count |", "|---|---|"]
    for k, v in counts.most_common():
        lines.append(f"| {k} | {v} |")
    lines += ["", f"Required-target recall: **{target_hits}/{target_total}**",
              f"Strict target overlap (non-selected actual vs any Oracle target): **{tp}/{target_precision_den}**. "
              "Oracle target sets are not exhaustive, so this is a lower-bound overlap, not a precision estimate.",
              "", "## Per-entry results", "",
              "| id | expected | actual | status | required hit | boundaries |",
              "|---|---|---|---|---|---|"]
    for r in results:
        b = len(r.get("boundaries", []))
        lines.append(f"| `{r['id']}` | {r['expectedKind']} | {r['actualKind']} | "
                     f"{r['status']} | {r.get('matchedRequiredTargets',0)}/"
                     f"{r.get('requiredTargets',0)} | {b} |")
    lines += ["", "## Interpretation", "",
              "`correct-exact` requires the prototype's result kind to be Exact and every "
              "required Oracle target to be present. `correct-multiple` allows an additional "
              "Conditional classification, reflecting loop/dynamic selection. "
              "`correct-conditional` requires at least one required target. "
              "Boundary cases are counted only when the prototype stops with an explicit boundary.",
              "",
              "A nonzero mismatch count is a real prototype limitation, not a skipped test. "
              "The Oracle was authored independently and was not edited to match this output."]
    REPORT.write_text("\n".join(lines) + "\n")
    print(json.dumps({k: v for k, v in report.items() if k != "results"}, indent=2))


if __name__ == "__main__":
    main()
