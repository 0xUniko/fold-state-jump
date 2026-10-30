#!/usr/bin/env python3
"""state-trace: independent source-level state provenance prototype.

The prototype consumes the Clang AST/CFG inventory emitted by ast-inventory and
answers four deliberately distinct queries:

  origin      the value source(s) of the selected state/field
  mutation    the nearest preceding write(s) that may reach the selection
  history     a backward sequence of writes and transfers, including folds
  provenance  the transfer edges (parameter, aggregate field, move, return, fold)

It does not read the old fold-state-jump result and contains no nano-infer
business-name rules.  Fold behavior comes from the generic `fold-seed`,
`fold-result`, lambda-parameter, and CFG recurrence records.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "research" / "inventory" / "raw"


@dataclass
class Event:
    raw: dict
    fn: str
    block: int
    order: int
    kind: str
    sub: str
    storage: str
    root: str
    suffix: str
    value: str
    file: str
    line: int
    col: int
    offset: int
    end_line: int
    end_col: int
    end_offset: int
    expr: str
    callee: str
    callee_usr: str
    args: list
    receiver: str
    event_id: int

    @classmethod
    def from_json(cls, r):
        return cls(
            raw=r, fn=r.get("fn", ""), block=r.get("block", 0),
            order=r.get("order", 0), kind=r.get("event", ""),
            sub=r.get("subkind", ""), storage=r.get("storage", ""),
            root=r.get("root", ""), suffix=r.get("suffix", ""),
            value=r.get("value", ""), file=r.get("file", ""),
            line=r.get("line", 0), col=r.get("col", 0),
            offset=r.get("offset", 0), end_line=r.get("endLine", r.get("line", 0)),
            end_col=r.get("endCol", r.get("col", 0)),
            end_offset=r.get("endOffset", r.get("offset", 0)),
            expr=r.get("expr", ""), callee=r.get("callee", ""),
            callee_usr=r.get("calleeUsr", ""), args=r.get("args", []),
            receiver=r.get("receiver", ""), event_id=r.get("id", 0),
        )


@dataclass
class Fold:
    id: int
    fn: str
    file: str
    line: int
    col: int
    seed_offset: int
    seed_line: int
    seed_text: str
    seed_type: str
    lambda_usr: str
    dest: str
    api: str
    seed_fields: list = field(default_factory=list)
    back_edges: list = field(default_factory=list)


@dataclass
class Target:
    file: str
    line: int
    col: int
    end_line: int
    end_col: int
    expr: str
    frame: str
    frame_usr: str
    storage: str
    relation: str
    kind: str
    may: bool = True
    conditions: list = field(default_factory=list)
    evidence: list = field(default_factory=list)
    boundary: bool = False


class Program:
    def __init__(self, path: Path):
        self.path = path
        self.name = path.stem
        self.functions = {}
        self.records = {}
        self.events = []
        self.by_id = {}
        self.by_fn = defaultdict(list)
        self.cfg = {}
        self.preds = defaultdict(list)
        self.folds = {}
        self.fold_by_lambda = {}
        self.calls_by_callee = defaultdict(list)
        self.instances_by_pattern = defaultdict(list)
        self.captures_by_lambda = defaultdict(list)
        self.files = set()
        self._load()

    def _load(self):
        raw = []
        with self.path.open() as f:
            for line in f:
                try:
                    raw.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
        for r in raw:
            k = r.get("kind")
            if k == "function":
                self.functions[r.get("usr")] = r
            elif k == "record":
                self.records[r.get("usr")] = r
            elif k == "event":
                e = Event.from_json(r)
                self.events.append(e)
                self.by_id[e.event_id] = e
                self.by_fn[e.fn].append(e)
                if e.file:
                    self.files.add(e.file)
                if e.kind == "call":
                    if e.callee_usr:
                        self.calls_by_callee[e.callee_usr].append(e)
                if e.kind == "capture" and e.raw.get("lambda"):
                    self.captures_by_lambda[e.raw["lambda"]].append(e)
            elif k == "cfg-block":
                self.cfg[(r.get("fn"), r.get("id"))] = r
            elif k == "fold":
                f = Fold(r.get("id"), r.get("fn"), r.get("file", ""),
                         r.get("line", 0), r.get("col", 0),
                         r.get("seedOffset", 0), r.get("seedLine", 0),
                         r.get("seedText", ""), r.get("seedType", ""),
                         r.get("lambdaUsr", ""), r.get("destStorage", ""),
                         r.get("api", ""))
                self.folds[f.id] = f
                if f.lambda_usr:
                    self.fold_by_lambda[f.lambda_usr] = f
        for usr, f in self.functions.items():
            pat = f.get("patternUsr")
            if pat:
                self.instances_by_pattern[pat].append(usr)
        for e in self.events:
            self.by_fn[e.fn].append(e)
        for (fn, bid), b in self.cfg.items():
            for s in b.get("succ", []):
                self.preds[(fn, s["id"])].append((fn, bid, b))
        # Synthetic fold edges.
        for f in self.folds.values():
            lam_events = self.by_fn.get(f.lambda_usr, [])
            if not lam_events:
                continue
            params = self.functions.get(f.lambda_usr, {}).get("params", [])
            if not params:
                continue
            acc = "decl:" + params[0]["usr"]
            # Seed field writes are in the enclosing function at the seed line.
            for e in self.by_fn.get(f.fn, []):
                if e.kind == "fold-seed" and acc in e.storage:
                    f.seed_fields.append(e)
            for e in lam_events:
                if e.kind == "return":
                    f.back_edges.append(e)
        # function event ordering by block/order
        for fn in self.by_fn:
            self.by_fn[fn].sort(key=lambda e: (e.block, e.order, e.event_id))

    def fn_name(self, usr):
        return self.functions.get(usr, {}).get("qualified", usr)

    def fn_file(self, usr):
        return self.functions.get(usr, {}).get("file", "")

    def lambda_param(self, usr):
        p = self.functions.get(usr, {}).get("params", [])
        return ("decl:" + p[0]["usr"]) if p else ""

    def resolve_site(self, file, line, col):
        file = os.path.abspath(file)
        cands = []
        for e in self.events:
            if os.path.abspath(e.file) != file:
                continue
            if e.line != line:
                continue
            span = max(0, e.end_offset - e.offset)
            if e.col <= col <= max(e.end_col, e.col) or abs(e.col - col) <= 1:
                if e.storage or e.kind in {"alias", "fold-seed", "write",
                                           "return", "call", "move", "copy",
                                           "capture", "fold-result"}:
                    cands.append((span, e))
        if not cands:
            # Clicking whitespace or a keyword inside an expression: choose the
            # nearest indexed event on the same line, preferring storage paths.
            same = [e for e in self.events
                    if os.path.abspath(e.file) == file and e.line == line]
            if not same:
                return None
            same.sort(key=lambda e: (0 if e.storage else 1, abs(e.col - col),
                                     -len(e.storage)))
            return same[0]
        cands.sort(key=lambda x: (x[0], -len(x[1].storage), x[1].order))
        return cands[0][1]

    def cfg_of(self, fn):
        blocks = {bid: b for (f, bid), b in self.cfg.items() if f == fn}
        return blocks


class Tracer:
    MAX_NODES = 400
    MAX_DEPTH = 24

    def __init__(self, prog: Program):
        self.p = prog
        self.targets = []
        self.boundaries = []
        self.provenance = []
        self.visited = set()
        self.nodes = 0
        self.conditional = False
        self.loop = False
        self._alias_cache = {}

    # ---------- storage path helpers ----------
    def split_suffix(self, s):
        m = re.match(r"^(.*?)((?:\.[A-Za-z_]\w*|->[A-Za-z_]\w*|\[[^\]]*\])*)$", s)
        if not m:
            return s, ""
        return m.group(1), m.group(2)

    def suffix_segments(self, suf):
        return re.findall(r"\.([A-Za-z_]\w*)|->([A-Za-z_]\w*)|(\[[^\]]*\])", suf)

    def def_supplies(self, dpath, qpath):
        """A write to dpath supplies qpath only if dpath is the same object,
        the queried object's parent, or a may-aliasing dynamic element."""
        if not dpath or not qpath:
            return False
        if dpath == qpath:
            return True
        if qpath.startswith(dpath + ".") or qpath.startswith(dpath + "->") or \
           qpath.startswith(dpath + "["):
            return True
        dn = re.sub(r"\[[^\]]*\]", "[*]", dpath)
        qn = re.sub(r"\[[^\]]*\]", "[*]", qpath)
        if dn == qn:
            return True
        if qn.startswith(dn + ".") or qn.startswith(dn + "->") or \
           qn.startswith(dn + "["):
            return True
        return False

    def is_subpath(self, a, b):
        """True if path a and path b overlap in a may-alias sense."""
        if not a or not b:
            return False
        if a == b:
            return True
        if a.startswith(b + ".") or a.startswith(b + "->") or a.startswith(b + "["):
            return True
        if b.startswith(a + ".") or b.startswith(a + "->") or b.startswith(a + "["):
            return True
        # Dynamic indices alias each other under the same container.
        pa = re.sub(r"\[[^\]]*\]", "[*]", a)
        pb = re.sub(r"\[[^\]]*\]", "[*]", b)
        if pa == pb:
            return True
        if pa.startswith(pb + ".") or pa.startswith(pb + "->") or \
           pa.startswith(pb + "["):
            return True
        if pb.startswith(pa + ".") or pb.startswith(pa + "->") or \
           pb.startswith(pa + "["):
            return True
        return False

    def aliases_in(self, fn):
        if fn in self._alias_cache:
            return self._alias_cache[fn]
        out = {}
        for e in self.p.by_fn.get(fn, []):
            if e.kind == "alias" and e.storage and e.value:
                out[e.storage] = e.value
        self._alias_cache[fn] = out
        return out

    def resolve_alias(self, storage, fn, before_event=None, _depth=0):
        if not storage or _depth > 8:
            return storage
        aliases = self.aliases_in(fn)
        # Longest root match, so a field of an alias resolves too.
        for src in sorted(aliases, key=len, reverse=True):
            if storage == src or storage.startswith(src + ".") or \
               storage.startswith(src + "->") or storage.startswith(src + "["):
                suffix = storage[len(src):]
                return self.resolve_alias(aliases[src] + suffix, fn, before_event,
                                          _depth + 1)
        return storage

    def event_desc(self, e):
        return {
            "file": e.file, "line": e.line, "col": e.col,
            "endLine": e.end_line, "endCol": e.end_col,
            "expr": e.expr, "event": e.kind, "subkind": e.sub,
            "frame": self.p.fn_name(e.fn), "frameUsr": e.fn,
            "storage": e.storage,
        }

    def add_target(self, e: Event, relation, kind, may=True, conditions=None,
                   evidence=None, boundary=False):
        t = Target(e.file, e.line, e.col, e.end_line, e.end_col, e.expr,
                   self.p.fn_name(e.fn), e.fn, e.storage, relation, kind,
                   may, conditions or [], evidence or [], boundary)
        key = (t.file, t.line, t.col, t.kind, t.relation, t.storage, t.frame_usr)
        if not any((x.file, x.line, x.col, x.kind, x.relation, x.storage,
                    x.frame_usr) == key for x in self.targets):
            self.targets.append(t)
        return t

    def add_boundary(self, e: Event, reason, storage=""):
        b = {
            "file": e.file, "line": e.line, "col": e.col,
            "expr": e.expr, "frame": self.p.fn_name(e.fn), "frameUsr": e.fn,
            "reason": reason, "storage": storage or e.storage,
        }
        if b not in self.boundaries:
            self.boundaries.append(b)

    def edge(self, src: Event, dst: Event | None, kind, detail=""):
        x = {
            "from": {"file": src.file, "line": src.line, "col": src.col,
                     "expr": src.expr, "frame": self.p.fn_name(src.fn)},
            "edge": kind,
            "detail": detail,
        }
        if dst:
            x["to"] = {"file": dst.file, "line": dst.line, "col": dst.col,
                       "expr": dst.expr, "frame": self.p.fn_name(dst.fn)}
        if x not in self.provenance:
            self.provenance.append(x)

    # ---------- reaching definitions ----------
    def _events_before(self, fn, block, order):
        evs = [e for e in self.p.by_fn.get(fn, []) if e.block == block]
        evs.sort(key=lambda e: (e.order, e.event_id))
        return [e for e in evs if e.order < order]

    def reaching_defs(self, fn, block, order, storage, depth=0):
        """May reaching definitions on CFG paths to (block, order)."""
        if depth > 40:
            return []
        key = (fn, block, order, storage, depth)
        if key in self.visited:
            return []
        self.visited.add(key)
        out = []
        # current block, backwards
        for e in reversed(self._events_before(fn, block, order)):
            if e.kind in {"write", "call-effect", "method-mutation",
                          "fold-result"}:
                if self.def_supplies(self.resolve_alias(e.storage, fn), storage):
                    out.append(e)
                    return out  # nearest write on this path
            if e.kind == "alias" and e.storage == storage:
                # A reference binding is not a write; report the binding.
                out.append(e)
                return out
        # predecessors
        preds = self.p.preds.get((fn, block), [])
        if not preds:
            # function entry: parameter / synthetic fold definition
            out.extend(self.entry_defs(fn, storage, depth))
            return out
        for pfn, pbid, pblock in preds:
            cond = pblock.get("terminator")
            got = self.reaching_defs(fn, pbid, 1 << 30, storage, depth + 1)
            for e in got:
                if cond and e not in out:
                    # attach condition in target later
                    pass
                if e not in out:
                    out.append(e)
        return out

    def entry_defs(self, fn, storage, depth):
        f = self.p.functions.get(fn, {})
        params = f.get("params", [])
        out = []
        root = self.split_suffix(storage)[0]
        # Find the parameter whose root matches.
        for idx, p in enumerate(params):
            pth = "decl:" + p["usr"]
            if root == pth or self.is_subpath(pth, storage):
                e = self._synthetic_param(fn, idx, pth)
                out.append(e)
                break
        # this parameter
        if not out and root.startswith("this:"):
            e = self._synthetic_param(fn, -1, root)
            out.append(e)
        # Captured outer variables: a reference capture aliases the enclosing
        # value; a value capture is a snapshot at lambda construction.
        caps = [c for c in self.p.captures_by_lambda.get(fn, [])
                if c.storage == root]
        if caps:
            for c in caps:
                if c.raw.get("captureKind") == "value":
                    self.add_target(c, "capture-value", "boundary",
                                    boundary=True)
                    self.add_boundary(c, "by-value lambda capture snapshot")
                else:
                    self.edge(c, None, "reference-capture",
                              "lambda body aliases enclosing storage")
                    ax = Event.from_json({
                        "kind": "event", "id": -abs(hash((c.event_id, root))) % (1 << 30),
                        "fn": c.fn, "event": "read", "storage": c.storage,
                        "root": root, "suffix": "", "expr": c.expr,
                        "file": c.file, "line": c.line, "col": c.col,
                        "offset": c.offset, "endLine": c.end_line,
                        "endCol": c.end_col, "endOffset": c.end_offset,
                    })
                    self.origin(ax, depth=depth + 1, relation="capture")
            return out
        # fold acc synthetic defs
        fold = self.p.fold_by_lambda.get(fn)
        if fold:
            acc = self.p.lambda_param(fn)
            if acc and (storage == acc or storage.startswith(acc + ".") or
                        storage.startswith(acc + "->") or storage.startswith(acc + "[")):
                out = [s for s in fold.seed_fields
                       if self.def_supplies(s.storage, storage)]
                for r in fold.back_edges:
                    out.append(self._synthetic_backedge(r, acc, storage))
                return out
        return out

    def _synthetic_backedge(self, ret, acc, storage):
        r = ret.raw.copy()
        r.update({"id": -abs(hash((ret.event_id, "backedge", storage))) % (1 << 30),
                  "event": "fold-backedge", "subkind": "backedge",
                  "storage": acc, "root": acc, "suffix": "", "value": ret.value})
        e = Event.from_json(r)
        e.raw["returnEvent"] = ret.event_id
        self.p.by_id[e.event_id] = e
        return e

    def _synthetic_param(self, fn, idx, root):
        f = self.p.functions.get(fn, {})
        evs = self.p.by_fn.get(fn, [])
        first = evs[0] if evs else None
        loc = {"file": f.get("file", "") or (first.file if first else ""),
               "line": f.get("line", 0) or (first.line if first else 0),
               "col": f.get("col", 0) or (first.col if first else 0),
               "endLine": f.get("line", 0) or (first.line if first else 0),
               "endCol": f.get("col", 0) or (first.col if first else 0)}
        r = {"kind": "event", "id": -abs(hash((fn, idx, root))) % (1 << 30),
             "fn": fn, "event": "param", "subkind": "param",
             "storage": root, "root": root, "suffix": "", "expr":
             ("this" if idx < 0 else f.get("params", [{}])[idx].get("name", "")),
             **loc, "offset": 0, "endOffset": 0}
        e = Event.from_json(r)
        self.p.by_id[e.event_id] = e
        return e

    # ---------- fold expansion ----------
    def fold_for_event(self, e: Event):
        # A seed event lives in the enclosing function; find a fold whose seed
        # range contains it.
        for f in self.p.folds.values():
            if f.fn == e.fn and f.seed_line and e.line == f.seed_line and \
               e.storage.endswith("." + self._field_suffix(f)):
                return f
        return None

    def _field_suffix(self, f):
        return ""

    def expand_fold_result(self, def_event: Event, storage, depth):
        m = re.search(r"fold:(\d+):result", def_event.value or "")
        if not m:
            return
        f = self.p.folds.get(int(m.group(1)))
        if not f:
            return
        self.loop = True
        acc = self.p.lambda_param(f.lambda_usr)
        # seed fields matching selected suffix
        suffix = storage[len(def_event.storage):] if def_event.storage and \
            storage.startswith(def_event.storage) else ""
        for s in f.seed_fields:
            if not suffix or self.is_subpath(s.storage + suffix, s.storage) or \
               s.storage.endswith(suffix):
                self.edge(def_event, s, "fold-seed",
                          "zero-iteration or first-iteration accumulator")
                self.follow_value(s, s.value, depth + 1, "fold-seed")
        for r in f.back_edges:
            self.edge(def_event, r, "fold-recurrence",
                      "last iteration returned accumulator")
            self.follow_value(r, r.value, depth + 1, "fold-return")

    # ---------- origin ----------
    def origin(self, e: Event, mode="origin", depth=0, relation="selected"):
        if e.kind == "alias" and e.value:
            self.edge(e, None, "reference-alias", "binding names target")
            self.add_target(e, "alias-binding", "alias")
            self.follow_value(e, e.value, depth + 1, "alias-target")
            return
        if depth > self.MAX_DEPTH or self.nodes > self.MAX_NODES:
            self.add_boundary(e, "analysis budget exhausted")
            return
        self.nodes += 1
        fn = e.fn
        storage = self.resolve_alias(e.storage, fn, e)
        if "[*:" in storage or "[at:" in storage:
            self.add_boundary(e, "dynamic container index may alias other elements", storage)
        if not storage:
            if e.value:
                self.follow_value(e, e.value, depth + 1, relation)
            else:
                self.add_boundary(e, "expression has no storage identity")
            return
        defs = self.reaching_defs(fn, e.block, e.order, storage)
        if not defs:
            self.add_target(e, relation, "declaration-or-boundary",
                            boundary=True)
            self.add_boundary(e, "no reaching definition in this translation unit")
            return
        for d in defs:
            self.visit_def(d, storage, e, depth, relation)

    def visit_def(self, d: Event, storage, use: Event, depth, relation):
        if d.kind == "param":
            self.follow_param(d, storage, use, depth, relation)
            return
        if d.kind == "fold-seed":
            self.loop = True
            self.conditional = True
            self.edge(d, use, "fold-seed-field", "aggregate seed field")
            self.add_target(d, "fold-seed", "initialization",
                            conditions=["fold iteration 0"])
            self.follow_value(d, d.value, depth + 1, "fold-seed-value")
            return
        if d.kind == "fold-backedge":
            self.loop = True
            self.conditional = True
            ret = self.p.by_id.get(d.raw.get("returnEvent"))
            self.edge(d, use, "fold-backedge",
                      "previous iteration returned accumulator")
            self.add_target(d, "fold-backedge", "loop-recurrence",
                            conditions=["fold iteration > 0"])
            if ret:
                self.origin(ret, depth=depth + 1, relation="fold-return")
            return
        if d.kind == "fold-result":
            self.expand_fold_result(d, storage, depth)
            return
        if d.kind == "alias":
            self.edge(d, use, "reference-alias", "alias does not write target")
            self.add_target(d, "alias-binding", "alias")
            self.follow_value(d, d.value, depth + 1, "alias-target")
            return
        if d.kind == "call-effect":
            self.edge(d, use, "call-effect", "callee may write through reference")
            self.follow_call_result(d, storage, depth, relation)
            return
        if d.kind == "method-mutation":
            self.edge(d, use, "method-mutation", d.expr)
            self.add_boundary(d, "container mutator may change element identity")
            return
        if d.kind in {"write", "fold-result"}:
            self.edge(d, use, "reaching-write", d.sub)
            # A write is a state event; origin continues to its value.
            self.add_target(d, "write", "write")
            suffix = storage[len(d.storage):] if storage.startswith(d.storage) else ""
            value = (d.value + suffix) if (suffix and d.value) else d.value
            if value and value != "increment" and value != "compound" and \
               value != "call-effect":
                self.follow_value(d, value, depth + 1, "write-value")
            elif d.value in {"increment", "compound"}:
                # Value depends on previous value: continue backwards as a
                # recurrence, not a new origin.
                self.loop = True
                prev = self.reaching_defs(d.fn, d.block, d.order, storage)
                for p in prev:
                    if p is not d:
                        self.visit_def(p, storage, use, depth + 1,
                                       "loop-recurrence")
            else:
                self.add_boundary(d, "write value is opaque")
            return
        self.add_boundary(d, "unmodeled definition")

    def follow_value(self, src: Event, value, depth, relation):
        if not value:
            self.add_boundary(src, "empty value provenance")
            return
        if value.startswith("call:"):
            self.follow_call_result(src, value, depth, relation)
            return
        if value.startswith("expr:"):
            self.add_boundary(src, "opaque expression value: " + value[5:])
            return
        if value.startswith("fold:"):
            self.expand_fold_result(src, src.storage, depth)
            return
        if value.startswith("return:"):
            return
        # Find the use at the same event: synthesize a read of `value`.
        root = value
        # Direct declaration initialization at the same site.
        defs = self.reaching_defs(src.fn, src.block, src.order, value)
        if not defs:
            self.add_boundary(src, "no reaching definition for transferred value",
                              value)
            return
        for d in defs:
            self.visit_def(d, value, src, depth, relation)

    def follow_param(self, d: Event, storage, use, depth, relation):
        f = self.p.functions.get(d.fn, {})
        idx = None
        for i, p in enumerate(f.get("params", [])):
            if d.storage == "decl:" + p["usr"] or d.storage.startswith(
                    "decl:" + p["usr"] + "."):
                idx = i
                break
        if idx is None and d.storage.startswith("this:"):
            idx = -1
        self.add_target(d, "parameter-binding", "parameter", conditions=[])
        if idx is None:
            self.add_boundary(d, "parameter identity not resolved")
            return
        fold = self.p.fold_by_lambda.get(d.fn)
        if fold:
            if idx != 0:
                self.add_boundary(d, "fold element identity is not statically fixed")
                return
            self.loop = True
            self.conditional = True
            acc = self.p.lambda_param(d.fn)
            suffix = storage[len(d.storage):] if storage.startswith(d.storage) else ""
            for s in fold.seed_fields:
                if not suffix or s.storage.endswith(suffix) or self.def_supplies(
                        s.storage, acc + suffix):
                    self.edge(d, s, "fold-seed-parameter",
                              "first iteration accumulator")
                    self.follow_value(s, s.value, depth + 1, "fold-seed")
            for r in fold.back_edges:
                sel = self._synthetic_backedge(r, acc, storage)
                self.edge(d, sel, "fold-backedge",
                          "previous iteration returned accumulator")
                self.origin(sel, depth=depth + 1, relation="fold-previous")
            if not fold.seed_fields and not fold.back_edges:
                self.add_boundary(d, "fold lambda is not indexed")
            return
        calls = []
        callee_keys = [d.fn] + self.p.instances_by_pattern.get(d.fn, [])
        for key in callee_keys:
            for c in self.p.calls_by_callee.get(key, []):
                if idx >= 0 and idx < len(c.args):
                    calls.append((c, c.args[idx]))
                elif idx < 0 and c.receiver:
                    calls.append((c, {"storage": c.receiver, "text": c.expr}))
        if not calls:
            self.add_boundary(d, "no call site in analyzed translation units")
            return
        if len(calls) > 1:
            self.conditional = True
        for c, arg in calls:
            ap = arg.get("storage", "")
            if not ap:
                self.add_boundary(c, "call argument has no storage path")
                continue
            self.edge(c, d, "argument-to-parameter",
                      f"arg[{idx}] -> {f.get('qualified', d.fn)} param")
            # Continue at the call site's argument expression.
            ax = Event.from_json({
                "kind": "event", "id": -abs(hash((c.event_id, idx, ap))) % (1 << 30),
                "fn": c.fn, "event": "read", "storage": ap, "root": "",
                "suffix": "", "expr": arg.get("text", ap),
                "file": c.file, "line": c.line, "col": c.col,
                "offset": c.offset, "endLine": c.end_line,
                "endCol": c.end_col, "endOffset": c.end_offset,
            })
            self.origin(ax, depth=depth + 1, relation="argument")

    def follow_call_result(self, src: Event, storage, depth, relation):
        m = re.search(r"call:(\d+)", storage or src.value or "")
        if not m:
            self.add_boundary(src, "unknown call result")
            return
        cid = int(m.group(1))
        suffix = (storage or src.value or "")[m.end():]
        call = self.p.by_id.get(cid)
        if not call:
            self.add_boundary(src, "call event not indexed")
            return
        callee = call.callee_usr
        if not callee or callee not in self.p.functions:
            self.add_boundary(call, "external or indirect callee")
            return
        self.edge(call, src, "call-return", call.callee)
        returns = [e for e in self.p.by_fn.get(callee, []) if e.kind == "return"]
        if not returns:
            self.add_boundary(call, "callee has no return event")
            return
        if len(returns) > 1:
            self.conditional = True
        for r in returns:
            self.follow_return(r, call, depth, relation, suffix)

    def follow_return(self, r: Event, call: Event, depth, relation,
                      suffix=""):
        # Aggregate return-field edges carry the field suffix explicitly.
        callee_fields = [e for e in self.p.by_fn.get(r.fn, [])
                         if e.kind == "return-field"
                         and e.storage.startswith("return:" + r.fn)]
        for f in callee_fields:
            if suffix and not (f.storage.endswith(suffix) or
                               suffix in f.storage):
                continue
            self.edge(f, call, "return-field", f.storage)
            self.follow_value(f, f.value, depth + 1, "return-field")
        if callee_fields:
            return
        # Map callee parameter roots to call arguments.
        params = self.p.functions.get(r.fn, {}).get("params", [])
        value = r.value
        if value:
            for i, p in enumerate(params):
                pth = "decl:" + p["usr"]
                if value == pth or value.startswith(pth + ".") or \
                   value.startswith(pth + "->") or value.startswith(pth + "["):
                    if i < len(call.args):
                        arg = call.args[i].get("storage", "")
                        if arg:
                            mapped = arg + value[len(pth):] + suffix
                            self.edge(r, call, "return-value",
                                      f"callee param[{i}] -> call argument")
                            rv = Event.from_json({
                                "kind": "event",
                                "id": -abs(hash((r.event_id, i, mapped))) % (1 << 30),
                                "fn": call.fn, "event": "read",
                                "storage": mapped, "root": "", "suffix": "",
                                "expr": value,
                                "file": call.file, "line": call.line,
                                "col": call.col, "offset": call.offset,
                                "endLine": call.end_line, "endCol": call.end_col,
                                "endOffset": call.end_offset,
                            })
                            self.origin(rv, depth=depth + 1,
                                        relation="return-value")
                            return
        # Return of a local/aggregate: trace inside the callee.
        if r.value:
            self.edge(r, call, "return-value", r.value + suffix)
            self.origin(r, depth=depth + 1, relation="return")

    # ---------- mutation / history ----------
    def mutation(self, e: Event, history=False):
        fn = e.fn
        storage = self.resolve_alias(e.storage, fn, e)
        if "[*:" in storage or "[at:" in storage:
            self.add_boundary(e, "dynamic container index may alias other elements", storage)
        if not storage:
            self.add_boundary(e, "selection has no storage identity")
            return
        if "[*:" in storage or "[at:" in storage:
            self.add_boundary(e, "dynamic container index may alias other elements", storage)
        self.mutation_walk(fn, e.block, e.order, storage, e, 0, history,
                           first=True)

    def mutation_walk(self, fn, block, order, storage, query, depth, history,
                      first=False):
        if depth > 16 or self.nodes > self.MAX_NODES:
            self.add_boundary(query, "history budget exhausted")
            return
        self.nodes += 1
        defs = self.reaching_defs(fn, block, order, storage)
        if not defs:
            if first:
                self.add_target(query, "no-prior-mutation", "NoPriorMutation",
                                may=False)
            return
        for d in defs:
            if d.kind == "param":
                self.add_target(d, "parameter", "parameter")
                # Parameter has no prior mutation inside this function.
                continue
            if d.kind == "fold-seed":
                self.add_target(d, "fold-seed", "initialization",
                                conditions=["fold iteration 0"])
                continue
            if d.kind == "fold-backedge":
                self.loop = True
                self.conditional = True
                self.add_target(d, "fold-backedge", "loop-recurrence",
                                conditions=["fold iteration > 0"])
                ret = self.p.by_id.get(d.raw.get("returnEvent"))
                if ret and history:
                    self.mutation_walk(ret.fn, ret.block, ret.order, storage,
                                       ret, depth + 1, history)
                continue
            if d.kind == "alias":
                self.add_target(d, "alias-binding", "alias")
                continue
            if d.kind == "fold-result":
                self.add_target(d, "fold-result", "fold-result")
                self.expand_fold_result(d, storage, depth + 1)
                continue
            self.add_target(d, "prior-write", "mutation")
            if history and (d.value in {"increment", "compound"} or
                            d.value == storage):
                self.loop = True
                self.mutation_walk(d.fn, d.block, d.order, storage, d,
                                   depth + 1, history)
            elif history and d.value and not d.value.startswith("call:"):
                self.mutation_walk(d.fn, d.block, d.order, d.value, d,
                                   depth + 1, history)

    def run(self, e: Event, mode):
        self.add_target(e, "selected", "selected", may=False)
        if mode == "origin":
            self.origin(e, mode)
        elif mode == "provenance":
            self.origin(e, mode)
        elif mode in {"mutation", "history"}:
            self.mutation(e, history=(mode == "history"))
        else:
            raise ValueError(mode)

    def result(self, e, mode):
        kind = "Exact"
        real = [t for t in self.targets if t.kind not in
                {"selected", "parameter", "alias", "NoPriorMutation"}]
        if self.boundaries:
            kind = "Boundary"
        if len({(t.file, t.line, t.col, t.kind) for t in real}) > 1:
            kind = "Multiple"
        if self.conditional and kind == "Exact":
            kind = "Conditional"
        if self.loop and kind in {"Exact", "Conditional"}:
            kind = "Conditional" if kind == "Conditional" else "Multiple"
        if mode in {"mutation", "history"} and not real and self.boundaries:
            kind = "Boundary"
        if mode in {"mutation", "history"} and not real and not self.boundaries:
            kind = "NoPriorMutation"
        return {
            "query": {
                "file": e.file, "line": e.line, "col": e.col,
                "expression": e.expr, "mode": mode,
                "semanticIdentity": {
                    "frame": self.p.fn_name(e.fn), "frameUsr": e.fn,
                    "storage": e.storage, "subkind": e.sub,
                },
            },
            "expectationKind": kind,
            "targets": [t.__dict__ for t in self.targets],
            "provenance": self.provenance,
            "boundaries": self.boundaries,
            "limitations": [
                "may analysis; branch/path feasibility is not proven",
                "one translation unit cluster; callers outside it are boundaries",
                "pointer points-to and dynamic container element identity are conservative",
            ],
        }


def choose_tu(file, line, col, tu_arg):
    files = sorted(RAW.glob("*.ndjson"))
    if tu_arg:
        for f in files:
            if tu_arg in f.stem:
                return Program(f)
        raise SystemExit(f"translation unit not found: {tu_arg}")
    best = None
    for f in files:
        p = Program(f)
        e = p.resolve_site(file, line, col)
        if e:
            score = len(p.by_fn.get(e.fn, []))
            if not best or score > best[0]:
                best = (score, p, e)
    if not best:
        raise SystemExit("no inventory event at the requested source position")
    return best[1]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", required=True)
    ap.add_argument("--line", type=int, required=True)
    ap.add_argument("--column", type=int, required=True)
    ap.add_argument("--mode", choices=["origin", "mutation", "history",
                                      "provenance"], default="origin")
    ap.add_argument("--tu", default="")
    ap.add_argument("--inventory", default="")
    ap.add_argument("--format", default="json")
    ap.add_argument("--compile-commands", default="")
    ap.add_argument("--max-targets", type=int, default=80)
    args = ap.parse_args()

    p = (Program(Path(args.inventory)) if args.inventory
         else choose_tu(args.file, args.line, args.column, args.tu))
    e = p.resolve_site(args.file, args.line, args.column)
    if not e:
        raise SystemExit("no inventory event at the requested source position")
    tr = Tracer(p)
    tr.run(e, args.mode)
    out = tr.result(e, args.mode)
    out["translationUnitInventory"] = str(p.path)
    out["targets"] = out["targets"][:args.max_targets]
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
