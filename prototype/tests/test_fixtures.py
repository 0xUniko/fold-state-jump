#!/usr/bin/env python3
"""Independent fixture tests for the state_trace prototype.

These tests use no nano-infer names and no old-plugin output.  They are small
enough to be audited and are intended to catch generic semantic regressions.
"""
from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "prototype" / "src"))
from state_trace import Program, Tracer  # noqa: E402

FIX = ROOT / "prototype" / "fixtures"
INV = FIX / "inventory"


def run(name, line, col, mode):
    p = Program(INV / f"{name}.ndjson")
    e = p.resolve_site(str(FIX / f"{name}.cpp"), line, col)
    assert e is not None, f"no site at {name}:{line}:{col} ({e})"
    tr = Tracer(p)
    tr.run(e, mode)
    return tr.result(e, mode)


def lines(out):
    return {(t["line"], t["kind"]) for t in out["targets"]}


class FixtureTests(unittest.TestCase):
    def test_fold_seed_and_backedge(self):
        out = run("fold_recurrence", 37, 13, "history")
        ls = lines(out)
        self.assertIn(33, {l for l, _ in ls})
        self.assertIn(37, {l for l, _ in ls})
        self.assertIn(out["expectationKind"], {"Conditional", "Multiple"})

    def test_fold_result_origin(self):
        out = run("fold_recurrence", 44, 10, "origin")
        ls = lines(out)
        self.assertIn(33, {l for l, _ in ls})
        self.assertIn(40, {l for l, _ in ls})

    def test_reference_alias(self):
        out = run("fold_recurrence", 35, 15, "origin")
        ls = lines(out)
        self.assertIn(35, {l for l, _ in ls})
        self.assertIn(40, {l for l, _ in ls})

    def test_unrelated_same_name_field(self):
        out = run("negative_control", 9, 11, "origin")
        self.assertNotIn(8, {t["line"] for t in out["targets"]})

    def test_nearest_overwrite(self):
        out = run("negative_control", 16, 10, "mutation")
        self.assertIn(15, {t["line"] for t in out["targets"]})
        self.assertNotIn(13, {t["line"] for t in out["targets"]})

    def test_mutually_exclusive_branches(self):
        out = run("negative_control", 25, 10, "origin")
        ls = {t["line"] for t in out["targets"]}
        self.assertIn(22, ls)
        self.assertIn(24, ls)

    def test_copy_does_not_mutate_source(self):
        out = run("aggregate_negative", 21, 13, "mutation")
        self.assertNotIn(20, {t["line"] for t in out["targets"]})

    def test_optional_reset(self):
        out = run("optional_variant", 29, 10, "origin")
        ls = {t["line"] for t in out["targets"]}
        # The optional was installed at line 21 and reaches consume through
        # roundtrip's call argument.
        self.assertTrue(ls & {21, 25, 40, 41}, ls)

    def test_template_instances_are_distinct(self):
        p = Program(INV / "template_state.ndjson")
        fns = [f for f in p.functions.values()
               if f.get("qualified", "").endswith("accumulate_like")]
        inst = [f for f in fns if f.get("isTemplateInstantiation")]
        self.assertGreaterEqual(len(inst), 2)
        self.assertGreaterEqual(len({f.get("templateArgs") for f in inst}), 2)

    def test_unknown_pointer_and_indirect_calls(self):
        for name, line, col, mode in [
            ("pointer_callback", 12, 10, "origin"),
            ("pointer_callback", 26, 10, "origin"),
            ("pointer_callback", 30, 10, "origin"),
        ]:
            out = run(name, line, col, mode)
            self.assertTrue(out["boundaries"], (name, line, out["targets"]))

    def test_dynamic_index_boundary(self):
        out = run("dynamic_index", 10, 25, "mutation")
        self.assertTrue(out["boundaries"])

    def test_constant_index_not_dynamic_boundary(self):
        out = run("dynamic_index", 19, 21, "mutation")
        reasons = " ".join(b["reason"] for b in out["boundaries"])
        self.assertNotIn("dynamic container index", reasons)

    def test_boundary_for_external_async(self):
        out = run("async_handle", 23, 3, "origin")
        self.assertTrue(out["boundaries"])


if __name__ == "__main__":
    unittest.main()
