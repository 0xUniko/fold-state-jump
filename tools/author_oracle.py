#!/usr/bin/env python3
"""Author the independent nano-infer Oracle.

This file records C++-semantic expectations derived from source inspection and
Clang AST facts.  It intentionally does not consume state_trace output.
"""
import hashlib
import json
from pathlib import Path

NANO = Path("/home/huawei/nano-infer")
OUT = Path(__file__).resolve().parents[1] / "research" / "oracle" / "nano-infer-oracle.jsonl"

FILES = [
    "minicpm-v-4_7/pipeline.h", "minicpm-v-4_7/experts.h",
    "minicpm-v-4_7/expert_io.h", "minicpm-v-4_7/ffn.h",
    "minicpm-v-4_7/cli.cpp", "deepseek-v4-flash/attention_pipeline.h",
    "deepseek-v4-flash/attention_node.cpp", "deepseek-v4-flash/ffn_service.h",
    "deepseek-v4-flash/dsv4_ffn.h",
]
HASHES = {f: hashlib.sha256((NANO / f).read_bytes()).hexdigest() for f in FILES}


def t(file, line, anchor, role, col=1):
    return {"file": file, "line": line, "column": col, "anchor": anchor,
            "role": role, "required": True}


def e(file, line, quote, kind="source"):
    return {"file": file, "line": line, "quote": quote, "kind": kind}


def entry(id, file, line, col, anchor, mode, kind, targets, edges,
          conditions, boundaries, evidence, context, notes="",
          may="may"):
    return {
        "id": id,
        "project": "nano-infer",
        "sourceRevision": "2e523d9e1d6c198988cab4193971093907f767f5+dirty-2026-10-30",
        "sourceHashes": HASHES,
        "query": {"file": file, "anchor": anchor, "line": line,
                  "column": col, "mode": mode},
        "context": context,
        "expectation": {"kind": kind, "targets": targets,
                        "requiredEdges": edges, "conditions": conditions,
                        "boundaries": boundaries, "mayMust": may},
        "evidence": evidence,
        "reviewStatus": "reviewed-manual",
        "notes": notes,
    }


C = "minicpm-v-4_7/"
D = "deepseek-v4-flash/"
rows = []

# ---------------------------------------------------------------------------
# MiniCPM execute: fold seed, accumulator, alias, writes, result, batch return
# ---------------------------------------------------------------------------
rows.append(entry(
    "minicpm.execute.seed.bank_state.origin", C+"pipeline.h", 869, 34,
    "std::move(session_state.bank_state)", "origin", "Multiple",
    [t(C+"pipeline.h", 814, "SessionState session_state", "parameter"),
     t(C+"pipeline.h", 1322, "run_embeddings(SessionState session_state", "caller-parameter"),
     t(C+"pipeline.h", 1332, "run_batch(SessionState session_state", "caller-parameter"),
     t(C+"pipeline.h", 1280, "return {0, 0, std::move(caches), std::move(bank_state), {}}", "session-initialization"),
     t(C+"pipeline.h", 1299, "return {0, 0, std::move(session_state.caches)", "session-reset")],
    ["aggregate-field", "value-transfer", "argument-to-parameter", "return-value"],
    ["caller may be run_batch or run_embeddings",
     "the SessionState may be a fresh session, a reset session, or the previous batch"],
    ["the concrete previous batch is not unique without a runtime call-site choice"],
    [e(C+"pipeline.h", 868, "LayerExecution{std::move(session_state.caches),"),
     e(C+"pipeline.h", 869, "std::move(session_state.bank_state),"),
     e(C+"pipeline.h", 1275, "auto bank_state = apply_prewarm("),
     e(C+"pipeline.h", 1303, "BankState{std::move(session_state.bank_state.shared_bank),")],
    {"function": "Pipeline::execute", "templateInstance": "TokenInput and EmbeddingInput instances",
     "statePath": ["session_state", "bank_state"], "foldSite": "pipeline.h:866"}))

rows.append(entry(
    "minicpm.execute.seed.aggregate-field-mapping", C+"pipeline.h", 872, 30,
    "layer_execution.bank_state", "provenance", "Exact",
    [t(C+"pipeline.h", 859, "BankState bank_state;", "destination-member"),
     t(C+"pipeline.h", 871, "LayerExecution layer_execution", "accumulator-parameter"),
     t(C+"pipeline.h", 869, "std::move(session_state.bank_state)", "seed-field")],
    ["aggregate-field", "member-order", "value-transfer"],
    ["second initializer maps to second member by semantic field order, not by name"],
    [],
    [e(C+"pipeline.h", 855, "struct LayerExecution {"),
     e(C+"pipeline.h", 857, "std::vector<LayerCache> caches;"),
     e(C+"pipeline.h", 859, "BankState bank_state;"),
     e(C+"pipeline.h", 860, "GraphCache graph_cache;")],
    {"function": "Pipeline::execute", "statePath": ["LayerExecution", "bank_state"],
     "foldSite": "pipeline.h:866"},
    "Clang InitListExpr exposes four initializers in declaration order; the second is bank_state."))

rows.append(entry(
    "minicpm.execute.lambda.bank_state.origin", C+"pipeline.h", 872, 30,
    "layer_execution.bank_state", "origin", "Conditional",
    [t(C+"pipeline.h", 869, "std::move(session_state.bank_state)", "fold-seed-value"),
     t(C+"pipeline.h", 871, "LayerExecution layer_execution", "accumulator-parameter"),
     t(C+"pipeline.h", 1188, "return layer_execution;", "fold-backedge")],
    ["fold-seed", "aggregate-field", "parameter-binding", "fold-recurrence"],
    ["iteration 0 uses the seed", "iteration > 0 uses the previous lambda return"],
    ["the exact iteration count is dynamic"],
    [e(C+"pipeline.h", 866, "auto layer_execution = ranges::fold_left("),
     e(C+"pipeline.h", 871, "[&](LayerExecution layer_execution, uint32_t layer) {"),
     e(C+"pipeline.h", 1188, "return layer_execution;")],
    {"function": "Pipeline::execute::lambda", "statePath": ["layer_execution", "bank_state"],
     "foldSite": "pipeline.h:866"}))

rows.append(entry(
    "minicpm.execute.lambda.alias-binding", C+"pipeline.h", 872, 17,
    "auto &bank_state = layer_execution.bank_state", "origin", "Exact",
    [t(C+"pipeline.h", 872, "layer_execution.bank_state", "alias-target")],
    ["reference-alias"],
    [], [],
    [e(C+"pipeline.h", 872, "auto &bank_state = layer_execution.bank_state;")],
    {"function": "Pipeline::execute::lambda", "statePath": ["bank_state"],
     "foldSite": "pipeline.h:866"},
    "Binding a reference is not a write to layer_execution.bank_state."))

rows.append(entry(
    "minicpm.execute.lambda.graph_reuses.history", C+"pipeline.h", 884, 15,
    "++bank_state.counters.graph_reuses", "history", "Conditional",
    [t(C+"pipeline.h", 869, "std::move(session_state.bank_state)", "seed"),
     t(C+"pipeline.h", 1209, "session_state.position + int(nt)", "previous-batch-return"),
     t(C+"pipeline.h", 1280, "std::move(bank_state)", "fresh-session-origin"),
     t(C+"pipeline.h", 1299, "return {0, 0, std::move(session_state.caches)", "reset-session-origin")],
    ["field-write", "argument-to-parameter", "return-value"],
    ["layer == 0 (the only iteration that executes this branch)",
     "graph cache hit",
     "no earlier iteration of this fold can execute line 884"],
    ["the previous batch's counter value is selected by runtime history; the whole-object replacement at 1081 is later in this iteration and is not a prior reaching definition for line 884",
     "the number of prior batches is not statically fixed"],
    [e(C+"pipeline.h", 881, "if (language_graphs_found != graph_cache.graphs.end()) {"),
     e(C+"pipeline.h", 884, "++bank_state.counters.graph_reuses;"),
     e(C+"pipeline.h", 1081, "bank_state = begin_decode_prefetch("),
     e(C+"pipeline.h", 1188, "return layer_execution;")],
    {"function": "Pipeline::execute::lambda", "statePath": ["bank_state", "counters", "graph_reuses"],
     "foldSite": "pipeline.h:866"},
    "Corrected after independent review: layer == 0 means the current fold iteration is the first; a same-fold backedge is impossible here."))

rows.append(entry(
    "minicpm.execute.lambda.graph_builds.history", C+"pipeline.h", 902, 15,
    "++bank_state.counters.graph_builds", "history", "Conditional",
    [t(C+"pipeline.h", 869, "std::move(session_state.bank_state)", "seed"),
     t(C+"pipeline.h", 1209, "session_state.position + int(nt)", "previous-batch-return"),
     t(C+"pipeline.h", 1280, "std::move(bank_state)", "fresh-session-origin"),
     t(C+"pipeline.h", 1299, "return {0, 0, std::move(session_state.caches)", "reset-session-origin")],
    ["field-write", "argument-to-parameter", "return-value"],
    ["layer == 0 (the only iteration that executes this branch)",
     "graph cache miss",
     "no earlier iteration of this fold can execute line 902"],
    ["the previous batch's counter value is selected by runtime history; line 1081 is later in this iteration, not a prior reaching definition",
     "iterator invalidation of graph_cache is not modeled as state provenance"],
    [e(C+"pipeline.h", 885, "} else {"),
     e(C+"pipeline.h", 902, "++bank_state.counters.graph_builds;"),
     e(C+"pipeline.h", 1081, "bank_state = begin_decode_prefetch(")],
    {"function": "Pipeline::execute::lambda", "statePath": ["bank_state", "counters", "graph_builds"],
     "foldSite": "pipeline.h:866"},
    "Corrected after independent review: layer == 0 means the current fold iteration is the first; a same-fold backedge is impossible here."))

rows.append(entry(
    "minicpm.execute.plan-slots.origin", C+"pipeline.h", 1001, 25,
    "plan.slots", "origin", "Multiple",
    [t(C+"experts.h", 424, "return {std::move(plan.slots)", "plan_shared_decode"),
     t(C+"ffn.h", 54, "inline PrefillPlan plan_prefill", "plan_prefill"),
     t(C+"experts.h", 501, "return {std::move(plan.slots)", "plan_cache_decode")],
    ["call-return", "aggregate-field", "move-value-transfer"],
    ["phase == Prefill selects plan_prefill",
     "phase == Decode with no layer cache selects plan_shared_decode",
     "phase == Decode with layer cache selects plan_cache_decode"],
    ["plan selection depends on runtime phase and layout"],
    [e(C+"pipeline.h", 990, "auto plan = plan_prefill(index, bank_context, bank_state, layer, selected);"),
     e(C+"pipeline.h", 1001, "bank_state.slots = std::move(plan.slots);")],
    {"function": "Pipeline::execute::lambda", "statePath": ["bank_state", "slots"],
     "foldSite": "pipeline.h:866"}))

rows.append(entry(
    "minicpm.execute.begin_decode_prefetch.value-transfer", C+"pipeline.h", 1081, 17,
    "bank_state = begin_decode_prefetch(", "provenance", "Boundary",
    [t(C+"experts.h", 616, "return bank_state;", "callee-return"),
     t(C+"pipeline.h", 1148, "bank_state.slots = std::move(plan.slots);", "caller-installation")],
    ["argument-to-parameter", "return-value", "whole-object-replacement", "move"],
    ["no pending prefetch exists", "a layer cache window exists"],
    ["std::move changes storage/value ownership; object identity is not preserved by the call expression",
     "prefetch I/O completion is asynchronous and not visible in C++ object fields"],
    [e(C+"experts.h", 532, "inline BankState begin_decode_prefetch("),
     e(C+"experts.h", 583, "bank_state.slots = std::move(plan.slots);"),
     e(C+"experts.h", 601, "bank_state.pending = PendingPrefetch{"),
     e(C+"pipeline.h", 1081, "bank_state = begin_decode_prefetch(")],
    {"function": "Pipeline::execute::lambda", "statePath": ["bank_state"],
     "foldSite": "pipeline.h:866"},
    "Transfer of a whole BankState value, not proof that the caller's storage is the callee's storage."))

rows.append(entry(
    "minicpm.execute.pending.reset", C+"pipeline.h", 1092, 15,
    "bank_state.pending.reset()", "mutation", "Conditional",
    [t(C+"experts.h", 601, "bank_state.pending = PendingPrefetch{", "pending-creation"),
     t(C+"pipeline.h", 1090, "auto pending = std::move(*bank_state.pending);", "pending-consumption")],
    ["optional-contains-value", "field-write", "fold-recurrence"],
    ["pending may have been created by the immediately preceding layer"],
    ["the runtime branch decides which layer created pending"],
    [e(C+"pipeline.h", 1087, "if (bank_state.pending->layer != layer)"),
     e(C+"pipeline.h", 1090, "auto pending = std::move(*bank_state.pending);"),
     e(C+"pipeline.h", 1092, "bank_state.pending.reset();")],
    {"function": "Pipeline::execute::lambda", "statePath": ["bank_state", "pending"],
     "foldSite": "pipeline.h:866"}))

rows.append(entry(
    "minicpm.execute.fold-result.bank_state", C+"pipeline.h", 1193, 19,
    "layer_execution.bank_state.pending", "origin", "Conditional",
    [t(C+"pipeline.h", 869, "std::move(session_state.bank_state)", "seed"),
     t(C+"pipeline.h", 1188, "return layer_execution;", "last-iteration-return"),
     t(C+"pipeline.h", 1081, "bank_state = begin_decode_prefetch(", "iteration-write")],
    ["fold-result", "fold-seed", "fold-recurrence", "aggregate-field"],
    ["zero iterations returns the seed", "N > 0 returns the last lambda accumulator"],
    ["pending must be empty at batch end; the throw is a runtime invariant"],
    [e(C+"pipeline.h", 1191, "auto &language_graphs = *layer_execution.graph_cache.graphs.at(key);"),
     e(C+"pipeline.h", 1193, "if (layer_execution.bank_state.pending)")],
    {"function": "Pipeline::execute", "statePath": ["layer_execution", "bank_state", "pending"],
     "foldSite": "pipeline.h:866"}))

rows.append(entry(
    "minicpm.execute.return.batchstate-field-mapping", C+"pipeline.h", 1211, 18,
    "std::move(layer_execution.bank_state)", "provenance", "Exact",
    [t(C+"pipeline.h", 413, "SessionState session_state;", "BatchState-field"),
     t(C+"pipeline.h", 405, "BankState bank_state;", "SessionState-field"),
     t(C+"pipeline.h", 1188, "return layer_execution;", "fold-result-source")],
    ["aggregate-field", "member-order", "fold-result", "value-transfer"],
    ["the return is a nested aggregate BatchState{SessionState{...}, logits}"],
    [],
    [e(C+"pipeline.h", 1209, "return {{session_state.position + int(nt), next_rope,"),
     e(C+"pipeline.h", 1211, "std::move(layer_execution.bank_state),")],
    {"function": "Pipeline::execute", "statePath": ["BatchState", "session_state", "bank_state"]},
    "Fourth SessionState initializer maps to BankState, not by identifier name."))

rows.append(entry(
    "minicpm.execute.position.read", C+"pipeline.h", 824, 18,
    "session_state.position + nt", "history", "Conditional",
    [t(C+"pipeline.h", 814, "SessionState session_state", "parameter"),
     t(C+"pipeline.h", 1209, "session_state.position + int(nt)", "previous-batch-update")],
    ["parameter-binding", "return-value", "field-write"],
    ["fresh session starts at zero", "each successful batch returns position + nt"],
    ["cross-batch execution count is not statically fixed"],
    [e(C+"pipeline.h", 824, "session_state.position + nt > size_t(context_size)"),
     e(C+"pipeline.h", 1209, "session_state.position + int(nt)")],
    {"function": "Pipeline::execute", "statePath": ["session_state", "position"],
     "foldSite": "caller prefill/generation folds"}))

rows.append(entry(
    "minicpm.run_batch.rope_position.origin", C+"pipeline.h", 1338, 18,
    "session_state.rope_position + i", "origin", "Multiple",
    [t(C+"pipeline.h", 1332, "SessionState session_state", "parameter"),
     t(C+"pipeline.h", 1280, "return {0, 0, std::move(caches)", "fresh-session"),
     t(C+"pipeline.h", 1209, "next_rope", "returned-next-rope"),
     t(C+"pipeline.h", 294, "batch_state.session_state.rope_position", "image-call-site")],
    ["parameter-binding", "argument-to-parameter", "aggregate-field", "return-value"],
    ["text caller uses one-dimensional positions", "image caller supplies a separate next_rope"],
    ["caller set is not unique"],
    [e(C+"pipeline.h", 1338, "session_state.rope_position + i % tokens.size()"),
     e(C+"pipeline.h", 1342, "const int next_rope = session_state.rope_position + int(tokens.size());"),
     e(C+"cli.cpp", 294, "const int base = batch_state.session_state.rope_position;")],
    {"function": "Pipeline::run_batch", "statePath": ["session_state", "rope_position"]}))

rows.append(entry(
    "minicpm.clear_session.pending.guard", C+"pipeline.h", 1286, 20,
    "session_state.bank_state.pending", "origin", "Conditional",
    [t(C+"pipeline.h", 1285, "SessionState clear_session(SessionState session_state)", "parameter"),
     t(C+"experts.h", 601, "bank_state.pending = PendingPrefetch{", "possible-producer")],
    ["parameter-binding", "optional-field", "call-argument"],
    ["clear_session rejects a session with an in-flight prefetch"],
    ["the runtime value is not statically known"],
    [e(C+"pipeline.h", 1286, "if (session_state.bank_state.pending)"),
     e(C+"pipeline.h", 1287, "throw std::invalid_argument(")],
    {"function": "Pipeline::clear_session", "statePath": ["session_state", "bank_state", "pending"]}))

rows.append(entry(
    "minicpm.clear_session.bankstate.reconstruction", C+"pipeline.h", 1298, 25,
    "session_state.bank_state.slots", "provenance", "Multiple",
    [t(C+"pipeline.h", 1298, "session_state.bank_state.slots", "slot-source"),
     t(C+"pipeline.h", 1303, "shared_bank", "preserved-resource"),
     t(C+"pipeline.h", 1304, "layer_banks", "preserved-resource"),
     t(C+"pipeline.h", 1305, "std::vector<std::optional<ExpertKey>>(slots.keys.size())", "reset-slots"),
     t(C+"pipeline.h", 1307, "frequencies", "reset-frequencies"),
     t(C+"pipeline.h", 1312, "{}", "reset-counters-and-pending")],
    ["aggregate-field", "move", "value-reset", "resource-ownership"],
    ["storage objects are preserved", "slot labels, ages, frequencies, counters, and pending are reset"],
    ["ggml buffers are resources; resetting metadata does not prove buffer contents are zeroed"],
    [e(C+"pipeline.h", 1298, "const auto &slots = session_state.bank_state.slots;"),
     e(C+"pipeline.h", 1303, "BankState{std::move(session_state.bank_state.shared_bank),"),
     e(C+"pipeline.h", 1305, "std::vector<std::optional<ExpertKey>>(slots.keys.size()),")],
    {"function": "Pipeline::clear_session", "statePath": ["SessionState", "bank_state"]}))

rows.append(entry(
    "minicpm.clear_session.buffer-content", C+"pipeline.h", 1292, 9,
    "ggml_backend_buffer_clear(full->buffer.get(), 0)", "mutation", "Boundary",
    [t(C+"pipeline.h", 1289, "ranges::for_each(session_state.caches", "cache-iteration"),
     t(C+"pipeline.h", 1292, "ggml_backend_buffer_clear", "external-resource-write")],
    ["external-capability", "buffer-content-write"],
    ["each LayerCache is a variant; both alternatives own a buffer"],
    ["the external backend clears device/host buffer contents; no C++ field is written",
     "the exact bytes and completion semantics are outside the AST"],
    [e(C+"pipeline.h", 1291, "if (const auto *full = std::get_if<FullAttentionCache>(&cache))"),
     e(C+"pipeline.h", 1292, "ggml_backend_buffer_clear(full->buffer.get(), 0);"),
     e(C+"pipeline.h", 1294, "ggml_backend_buffer_clear(std::get<DeltaNetCache>(cache).buffer.get(), 0);")],
    {"function": "Pipeline::clear_session", "statePath": ["session_state", "caches", "*", "buffer"]},
    "Resource content mutation differs from metadata/object reassignment."))

# ---------------------------------------------------------------------------
# Expert BankState folds and optional/variant state
# ---------------------------------------------------------------------------
rows.append(entry(
    "minicpm.plan_shared_decode.seed.slots", C+"experts.h", 409, 19,
    "bank_state.slots", "origin", "Exact",
    [t(C+"experts.h", 390, "const BankState &bank_state", "parameter"),
     t(C+"experts.h", 401, "SlotState slots;", "planning-field")],
    ["aggregate-field", "copy-value", "parameter-binding"],
    [], [],
    [e(C+"experts.h", 409, "Planning{bank_state.slots, {}, {}}"),
     e(C+"experts.h", 413, "plan.slots.keys[metadata] = std::nullopt;")],
    {"function": "plan_shared_decode", "statePath": ["bank_state", "slots"]}))

rows.append(entry(
    "minicpm.plan_shared_decode.dynamic-index-write", C+"experts.h", 413, 11,
    "plan.slots.keys[metadata] = std::nullopt", "mutation", "Boundary",
    [t(C+"experts.h", 411, "metadata_slot(bank_context.layout.working, slot)", "index"),
     t(C+"experts.h", 409, "Planning{bank_state.slots", "seed")],
    ["dynamic-index", "container-element-write", "fold-recurrence"],
    ["metadata depends on the current loop index and layout"],
    ["the exact element identity is not a constant; multiple indices may alias under optimization"],
    [e(C+"experts.h", 411, "const auto metadata = metadata_slot(bank_context.layout.working, slot);"),
     e(C+"experts.h", 413, "plan.slots.keys[metadata] = std::nullopt;")],
    {"function": "plan_shared_decode::lambda", "statePath": ["plan", "slots", "keys", "*"]}))

rows.append(entry(
    "minicpm.plan_cache_decode.found.original-snapshot", C+"experts.h", 475, 28,
    "resident_slot(bank_state.slots, window, key)", "origin", "Exact",
    [t(C+"experts.h", 442, "const BankState &bank_state", "parameter"),
     t(C+"experts.h", 470, "Planning{bank_state.slots, {}, {}, {}}", "planning-copy"),
     t(C+"experts.h", 475, "resident_slot(bank_state.slots", "original-snapshot-read")],
    ["parameter-binding", "copy-value", "field-read"],
    ["the lookup deliberately reads the original bank_state.slots, not plan.slots"],
    [],
    [e(C+"experts.h", 474, "// 查原快照；required 保护本次全部实际专家，前面的规划不会淘汰命中项。"),
     e(C+"experts.h", 475, "const auto found = resident_slot(bank_state.slots, window, key);")],
    {"function": "plan_cache_decode::lambda", "statePath": ["bank_state", "slots"]},
    "Negative case: a same-shaped field in the evolving accumulator must not capture this read."))

rows.append(entry(
    "minicpm.plan_cache_decode.misses.history", C+"experts.h", 485, 11,
    "++plan.slots.misses", "history", "Conditional",
    [t(C+"experts.h", 470, "Planning{bank_state.slots, {}, {}, {}}", "seed"),
     t(C+"experts.h", 485, "++plan.slots.misses", "prior-iteration-write"),
     t(C+"experts.h", 489, "++plan.slots.misses", "prefetch-miss-write"),
     t(C+"experts.h", 492, "++plan.slots.hits", "hit-write")],
    ["field-write", "fold-recurrence", "branch"],
    ["!found", "found && predicted", "found && !predicted"],
    ["branch feasibility depends on the routing table and cache contents"],
    [e(C+"experts.h", 484, "if (!found) {"),
     e(C+"experts.h", 485, "++plan.slots.misses;"),
     e(C+"experts.h", 488, "} else if (ranges::find(predicted, key) != predicted.end()) {"),
     e(C+"experts.h", 492, "++plan.slots.hits;")],
    {"function": "plan_cache_decode::lambda", "statePath": ["plan", "slots", "misses"]}))

rows.append(entry(
    "minicpm.begin_prefetch.pending.aggregate", C+"experts.h", 601, 5,
    "bank_state.pending = PendingPrefetch{", "provenance", "Multiple",
    [t(C+"experts.h", 236, "uint32_t layer;", "field-layer"),
     t(C+"experts.h", 239, "std::vector<ExpertKey> keys;", "field-keys"),
     t(C+"experts.h", 241, "std::vector<size_t> slots;", "field-slots"),
     t(C+"experts.h", 244, "LesClock::time_point issued;", "field-issued"),
     t(C+"experts.h", 246, "CacheReadTicket read_ticket;", "field-ticket")],
    ["aggregate-field", "move", "call-return", "optional-construction"],
    ["only executed when plan.placements is non-empty"],
    ["read_ticket ownership transfers into optional; actual read completion is asynchronous"],
    [e(C+"experts.h", 585, "if (!plan.placements.empty()) {"),
     e(C+"experts.h", 601, "bank_state.pending = PendingPrefetch{"),
     e(C+"experts.h", 613, "LesClock::now(), std::move(read_ticket)};")],
    {"function": "begin_decode_prefetch", "statePath": ["bank_state", "pending"]}))

rows.append(entry(
    "minicpm.apply_prewarm.bankstate.return", C+"experts.h", 809, 10,
    "return {std::move(bank_state.shared_bank)", "provenance", "Exact",
    [t(C+"experts.h", 743, "BankState bank_state", "parameter"),
     t(C+"experts.h", 751, "layer_banks", "fold-state-field"),
     t(C+"experts.h", 752, "SlotState slots", "fold-state-field"),
     t(C+"experts.h", 753, "uint64_t prewarm_loaded", "fold-state-field"),
     t(C+"experts.h", 754, "PhaseCounters prewarm_io", "fold-state-field")],
    ["aggregate-field", "move", "fold-result", "copy-value"],
    ["empty prewarm table returns the input unchanged"],
    ["per-layer I/O completion is required before the returned state is observable"],
    [e(C+"experts.h", 756, "auto prewarming = ranges::fold_left("),
     e(C+"experts.h", 809, "return {std::move(bank_state.shared_bank),")],
    {"function": "apply_prewarm", "statePath": ["BankState"]}))

rows.append(entry(
    "minicpm.victim_slot.fold", C+"experts.h", 354, 27,
    "window.begin", "origin", "Conditional",
    [t(C+"experts.h", 354, "window.begin, window.begin + window.slot_count", "range"),
     t(C+"experts.h", 355, "std::optional<size_t>{}", "seed"),
     t(C+"experts.h", 356, "slots.keys[slot]", "read"),
     t(C+"experts.h", 363, "slots.ages[slot] < slots.ages[*victim]", "lru-compare")],
    ["fold-seed", "field-read", "dynamic-index", "fold-result"],
    ["empty slot preferred", "otherwise minimum age among unlocked non-required slots"],
    ["element identity depends on runtime ages and locks"],
    [e(C+"experts.h", 353, "const auto victim = ranges::fold_left("),
     e(C+"experts.h", 360, "if (!victim || (!present && slots.keys[*victim]) ||"),
     e(C+"experts.h", 369, "return *victim;")],
    {"function": "victim_slot", "statePath": ["slots", "ages"]}))

rows.append(entry(
    "minicpm.record_frequency.element-write", C+"ffn.h", 225, 10,
    "ranges::fold_left(selected, &bank_state.frequencies.at(layer)", "mutation", "Boundary",
    [t(C+"ffn.h", 223, "record_frequency(BankState &bank_state", "reference-parameter"),
     t(C+"ffn.h", 225, "&bank_state.frequencies.at(layer)", "borrowed-pointer"),
     t(C+"ffn.h", 227, "++(*frequencies)[id]", "element-write")],
    ["address-of", "pointer-alias", "container-element-write", "fold"],
    ["the selected IDs are runtime routing results"],
    ["frequencies[layer][id] is reached through a borrowed pointer and a dynamic expert id"],
    [e(C+"ffn.h", 225, "ranges::fold_left(selected, &bank_state.frequencies.at(layer),"),
     e(C+"ffn.h", 227, "++(*frequencies)[id];")],
    {"function": "record_frequency", "statePath": ["bank_state", "frequencies", "layer", "*"]}))

# ---------------------------------------------------------------------------
# Async I/O state
# ---------------------------------------------------------------------------
rows.append(entry(
    "minicpm.expert_io.read_state.seed", C+"expert_io.h", 761, 11,
    "auto &read = task.batch->read", "origin", "Exact",
    [t(C+"expert_io.h", 755, "char *records;", "resource-pointer"),
     t(C+"expert_io.h", 756, "IoCounters io;", "counter-field"),
     t(C+"expert_io.h", 761, "auto &read = task.batch->read;", "borrowed-task")],
    ["aggregate-field", "borrow", "default-initialization"],
    ["worker task carries a pointer to the mapped/staged records"],
    ["pointer points-to is a resource borrow; the bytes are not copied by this seed"],
    [e(C+"expert_io.h", 763, "const auto read_state = ranges::fold_left("),
     e(C+"expert_io.h", 766, "RecordReadState{read.records, {}},")],
    {"function": "execute_shared_host_read", "statePath": ["RecordReadState"]}))

rows.append(entry(
    "minicpm.expert_io.async_completion", C+"expert_io.h", 779, 5,
    "record_read_success(*task.batch, read_state.io)", "provenance", "Boundary",
    [t(C+"expert_io.h", 770, "sum_io(read_state.io, read_record(...))", "io-accumulation"),
     t(C+"expert_io.h", 779, "record_read_success", "completion-signal")],
    ["call-effect", "external-io", "completion"],
    ["read_record performs pread/mmap"],
    ["the C++ object graph records counters and a completion, but not the physical disk/device state",
     "the completion path is a runtime synchronization point"],
    [e(C+"expert_io.h", 772, "read_record(*task.batch->store, {read.layer, expert},"),
     e(C+"expert_io.h", 779, "record_read_success(*task.batch, read_state.io);")],
    {"function": "execute_shared_host_read", "statePath": ["read_state", "io"]},
    "Submitting a read is not proof that bytes were installed."))

rows.append(entry(
    "minicpm.expert_io.finish_cache_ticket", C+"expert_io.h", 537, 9,
    "finish_cache_read(std::move(pending.read_ticket))", "origin", "Boundary",
    [t(C+"expert_io.h", 246, "CacheReadTicket read_ticket;", "ticket-field"),
     t(C+"expert_io.h", 588, "auto read_ticket = start_cache_read", "ticket-creation"),
     t(C+"expert_io.h", 523, "finish_cache_read(CacheReadTicket ticket)", "consumer")],
    ["move", "ticket-consumption", "wait"],
    ["the ticket may have been created by a previous layer's prefetch"],
    ["the actual read may still be in flight; the ticket's destructor/wait establishes ordering",
     "bank bytes are written by a worker thread outside this function body"],
    [e(C+"experts.h", 588, "auto read_ticket = start_cache_read("),
     e(C+"pipeline.h", 1090, "auto pending = std::move(*bank_state.pending);"),
     e(C+"expert_io.h", 523, "finish_cache_read(CacheReadTicket ticket)")],
    {"function": "Pipeline::execute::lambda", "statePath": ["pending", "read_ticket"]}))

# ---------------------------------------------------------------------------
# CLI generation/prefill state machine
# ---------------------------------------------------------------------------
rows.append(entry(
    "minicpm.cli.generation.seed", C+"cli.cpp", 528, 25,
    "generation.batch_state.logits", "origin", "Multiple",
    [t(C+"cli.cpp", 510, "BatchState batch_state = prefill(", "prefill-result"),
     t(C+"cli.cpp", 483, "struct Generation {", "record"),
     t(C+"cli.cpp", 543, "generation.batch_state = pipeline.run_batch(", "previous-iteration")],
    ["aggregate-field", "fold-seed", "move", "return-value"],
    ["fold runs limit times; limit depends on options/context"],
    ["the prefill result itself may be a multi-chunk fold result"],
    [e(C+"cli.cpp", 510, "BatchState batch_state ="),
     e(C+"cli.cpp", 518, "auto generation = ranges::fold_left("),
     e(C+"cli.cpp", 520, "Generation{std::move(batch_state), {}, false, 0, 0},")],
    {"function": "turn", "statePath": ["generation", "batch_state"], "foldSite": "cli.cpp:518"}))

rows.append(entry(
    "minicpm.cli.generation.batch_state.update", C+"cli.cpp", 543, 9,
    "generation.batch_state = pipeline.run_batch(", "origin", "Conditional",
    [t(C+"cli.cpp", 543, "pipeline.run_batch", "call"),
     t(C+"cli.cpp", 520, "std::move(batch_state)", "seed"),
     t(C+"cli.cpp", 544, "std::move(generation.batch_state.session_state)", "argument")],
    ["whole-field-write", "call-return", "fold-recurrence", "move"],
    ["not done", "context capacity remains", "sampled token is not EOG"],
    ["runtime sample decides whether this iteration writes"],
    [e(C+"cli.cpp", 522, "if (generation.done || generation.batch_state.session_state.position >="),
     e(C+"cli.cpp", 543, "generation.batch_state ="),
     e(C+"cli.cpp", 544, "pipeline.run_batch(std::move(generation.batch_state.session_state),")],
    {"function": "turn::lambda", "statePath": ["generation", "batch_state"], "foldSite": "cli.cpp:518"}))

rows.append(entry(
    "minicpm.cli.generation.text", C+"cli.cpp", 539, 21,
    "generation.text += piece", "history", "Conditional",
    [t(C+"cli.cpp", 520, "{}", "seed-empty-text"),
     t(C+"cli.cpp", 539, "generation.text += piece", "prior-iteration-append")],
    ["field-write", "fold-recurrence", "string-append"],
    ["non-terminal token produced a piece"],
    ["the number/content of iterations depends on model output"],
    [e(C+"cli.cpp", 536, "const auto piece = token_piece(vocab, token);"),
     e(C+"cli.cpp", 539, "generation.text += piece;")],
    {"function": "turn::lambda", "statePath": ["generation", "text"], "foldSite": "cli.cpp:518"}))

rows.append(entry(
    "minicpm.cli.generation.decode_tokens", C+"cli.cpp", 548, 11,
    "++generation.decode_tokens", "history", "Conditional",
    [t(C+"cli.cpp", 520, "0", "seed-zero"),
     t(C+"cli.cpp", 548, "++generation.decode_tokens", "prior-iteration-increment")],
    ["field-increment", "fold-recurrence"],
    ["one per non-terminal token that is sent back to decode"],
    ["the loop bound is dynamic"],
    [e(C+"cli.cpp", 547, "generation.decode_ns += elapsed_ns(decode_begin);"),
     e(C+"cli.cpp", 548, "++generation.decode_tokens;")],
    {"function": "turn::lambda", "statePath": ["generation", "decode_tokens"], "foldSite": "cli.cpp:518"}))

rows.append(entry(
    "minicpm.cli.prefill.batch_state.seed", C+"cli.cpp", 294, 26,
    "batch_state.session_state.rope_position", "origin", "Multiple",
    [t(C+"cli.cpp", 255, "SessionState session_state", "parameter"),
     t(C+"cli.cpp", 273, "return batch_state;", "unchanged-empty-chunk"),
     t(C+"cli.cpp", 275, "prefill_text(pipeline, std::move(batch_state.session_state)", "text-chunk"),
     t(C+"cli.cpp", 325, "pipeline.run_embeddings(", "image-chunk")],
    ["aggregate-field", "fold-seed", "fold-recurrence", "move", "return-value"],
    ["each chunk may be empty text, non-empty text, or image"],
    ["image chunk itself contains a nested fold over batch slices"],
    [e(C+"cli.cpp", 259, "return ranges::fold_left("),
     e(C+"cli.cpp", 261, "BatchState{std::move(session_state), {}},"),
     e(C+"cli.cpp", 266, "// 文本块可能为空；此时原样传递状态和上一块 logits。")],
    {"function": "prefill", "statePath": ["batch_state"], "foldSite": "cli.cpp:259"}))

# ---------------------------------------------------------------------------
# DeepSeek attention and generation
# ---------------------------------------------------------------------------
rows.append(entry(
    "deepseek.attention.cache.origin", D+"attention_pipeline.h", 1716, 23,
    "state.cache->layers.at(il)", "origin", "Multiple",
    [t(D+"attention_pipeline.h", 1683, "BatchResult run_batch(AttentionState state", "parameter"),
     t(D+"attention_pipeline.h", 1677, "AttentionState start_session()", "session-construction"),
     t(D+"attention_pipeline.h", 1470, "storage.push_back(", "cache-fold-construction")],
    ["parameter-binding", "capture", "unique-ownership", "fold-seed"],
    ["state is captured by reference inside the layer fold"],
    ["the cache owns allocation-backed tensors; pointer identity is stable across layers"],
    [e(D+"attention_pipeline.h", 1713, "const auto hidden = ranges::fold_left("),
     e(D+"attention_pipeline.h", 1716, "const auto &cache = state.cache->layers.at(il);"),
     e(D+"attention_pipeline.h", 1679, "new AttentionCaches(")],
    {"function": "AttentionPipeline::run_batch::lambda",
     "statePath": ["state", "cache", "layers", "*"], "foldSite": "attention_pipeline.h:1713"}))

rows.append(entry(
    "deepseek.attention.position.origin", D+"attention_pipeline.h", 1731, 24,
    "state.position.advance", "origin", "Conditional",
    [t(D+"attention_pipeline.h", 1683, "AttentionState state", "parameter"),
     t(D+"attention_pipeline.h", 1692, "const int next_position = state.position.next_position();", "read"),
     t(D+"attention_pipeline.h", 1731, "state.position.advance", "returned-state")],
    ["parameter-binding", "method-return", "field-read"],
    ["fresh session starts at zero", "each batch advances by tokens.size()"],
    ["the number of run_batch calls is dynamic"],
    [e(D+"attention_pipeline.h", 1692, "const int next_position = state.position.next_position();"),
     e(D+"attention_pipeline.h", 1731, "AttentionState(state.position.advance(static_cast<int>(tokens.size())),")],
    {"function": "AttentionPipeline::run_batch", "statePath": ["state", "position"]}))

rows.append(entry(
    "deepseek.attention.hidden.seed", D+"attention_pipeline.h", 1714, 15,
    "embedded", "origin", "Exact",
    [t(D+"attention_pipeline.h", 1711, "const auto embedded = execute_embedding(tokens);", "call-result"),
     t(D+"attention_pipeline.h", 1594, "return nano::read_f32(hidden);", "embedding-return")],
    ["fold-seed", "call-return", "value-transfer"],
    [], ["read_f32 returns host copies; tensor storage identity is not preserved"],
    [e(D+"attention_pipeline.h", 1711, "const auto embedded = execute_embedding(tokens);"),
     e(D+"attention_pipeline.h", 1713, "const auto hidden = ranges::fold_left(")],
    {"function": "AttentionPipeline::run_batch", "statePath": ["embedded"],
     "foldSite": "attention_pipeline.h:1713"}))

rows.append(entry(
    "deepseek.attention.ffn-return", D+"attention_pipeline.h", 1725, 18,
    "return ffn_output;", "provenance", "Boundary",
    [t(D+"attention_pipeline.h", 1722, "ffn.forward(", "rpc-call"),
     t(D+"attention_pipeline.h", 1725, "return ffn_output;", "fold-return")],
    ["external-call", "fold-return", "network-boundary"],
    ["the RPC may fail", "remote FFN service owns its state"],
    ["network RPC effects are outside the local C++ object graph",
     "returned values are host copies, not remote storage identity"],
    [e(D+"attention_pipeline.h", 1722, "const auto ffn_output = ffn.forward("),
     e(D+"attention_pipeline.h", 1725, "return ffn_output;")],
    {"function": "AttentionPipeline::run_batch::lambda",
     "statePath": ["ffn_output"], "foldSite": "attention_pipeline.h:1713"}))

rows.append(entry(
    "deepseek.generation.current.origin", D+"attention_node.cpp", 65, 24,
    "std::get<BatchResult>(state)", "origin", "Conditional",
    [t(D+"attention_node.cpp", 59, "Generation{std::move(std::get<BatchResult>(prefill))}", "seed"),
     t(D+"attention_node.cpp", 76, "pipeline.run_batch(std::move(current.state), {token})", "previous-iteration"),
     t(D+"attention_node.cpp", 62, "GenerationFinished{}", "terminal-alternative")],
    ["variant-alternative", "fold-seed", "fold-recurrence", "move"],
    ["state holds BatchResult", "state may already hold GenerationFinished"],
    ["std::get<BatchResult> is undefined if the alternative differs; the code checks holds_alternative first"],
    [e(D+"attention_node.cpp", 59, "Generation{std::move(std::get<BatchResult>(prefill))},"),
     e(D+"attention_node.cpp", 61, "if (std::holds_alternative<GenerationFinished>(state)) {"),
     e(D+"attention_node.cpp", 65, "auto &current = std::get<BatchResult>(state);")],
    {"function": "main::lambda", "statePath": ["state", "BatchResult"],
     "foldSite": "attention_node.cpp:57"}))

rows.append(entry(
    "deepseek.generation.next-state.origin", D+"attention_node.cpp", 76, 32,
    "std::move(current.state)", "origin", "Conditional",
    [t(D+"attention_node.cpp", 65, "std::get<BatchResult>(state)", "current-alternative"),
     t(D+"attention_node.cpp", 76, "pipeline.run_batch(std::move(current.state), {token})", "batch-call"),
     t(D+"attention_pipeline.h", 1731, "AttentionState(state.position.advance", "next-attention-state")],
    ["variant-alternative", "move", "argument-to-parameter", "return-value"],
    ["not finished", "token is not EOG", "index + 1 != predict"],
    ["the last iteration returns GenerationFinished instead of a new BatchResult"],
    [e(D+"attention_node.cpp", 72, "if (index + 1 == predict) {"),
     e(D+"attention_node.cpp", 73, "return GenerationFinished{};"),
     e(D+"attention_node.cpp", 76, "return pipeline.run_batch(std::move(current.state), {token});")],
    {"function": "main::lambda", "statePath": ["state", "BatchResult", "state"]}))

rows.append(entry(
    "deepseek.generation.finished.origin", D+"attention_node.cpp", 68, 20,
    "GenerationFinished{}", "origin", "NoPriorMutation",
    [t(D+"attention_node.cpp", 61, "std::holds_alternative<GenerationFinished>(state)", "guard"),
     t(D+"attention_node.cpp", 68, "return GenerationFinished{};", "new-alternative")],
    ["variant-alternative-construction", "no-state-transfer"],
    ["EOG token sampled", "or prediction limit reached"],
    ["GenerationFinished has no data fields; it deliberately discards the prior BatchResult"],
    [e(D+"attention_node.cpp", 67, "if (llama_vocab_is_eog(vocab, token)) {"),
     e(D+"attention_node.cpp", 68, "return GenerationFinished{};")],
    {"function": "main::lambda", "statePath": ["GenerationFinished"]},
    "Negative case: do not fabricate a prior mutation of a data field that the alternative does not contain."))

# ---------------------------------------------------------------------------
# DeepSeek FFN service
# ---------------------------------------------------------------------------
rows.append(entry(
    "deepseek.ffn.server.state-fold", D+"ffn_service.h", 670, 5,
    "ranges::fold_left(events, State{transport.await_call(), std::move(runtime)}", "provenance", "Conditional",
    [t(D+"ffn_service.h", 638, "struct State {", "record"),
     t(D+"ffn_service.h", 640, "FfnRuntime ffn;", "field"),
     t(D+"ffn_service.h", 674, "transport.advance(std::move(state.rpc), *event)", "rpc-transition"),
     t(D+"ffn_service.h", 680, "handle_request(state.ffn, *ready)", "non-const-effect")],
    ["aggregate-field", "fold-seed", "fold-recurrence", "call-effect", "move"],
    ["event is a request-ready event or another transport event"],
    ["the server loop runs until transport.next_event() returns nullopt"],
    [e(D+"ffn_service.h", 670, "ranges::fold_left("),
     e(D+"ffn_service.h", 671, "events, State{transport.await_call(), std::move(runtime)},"),
     e(D+"ffn_service.h", 678, "const auto reply = handle_request(state.ffn, *ready);")],
    {"function": "FfnServer::run", "statePath": ["State"], "foldSite": "ffn_service.h:670"}))

rows.append(entry(
    "deepseek.ffn.runtime.bank-growth", D+"ffn_service.h", 476, 5,
    "state.banks.push_back(prepare_expert_bank", "mutation", "Conditional",
    [t(D+"ffn_service.h", 471, "ranges::find_if(state.banks", "lookup"),
     t(D+"ffn_service.h", 476, "state.banks.push_back", "mutation"),
     t(D+"ffn_service.h", 491, "find_or_prepare_expert_bank(state, model, il, layout)", "call-effect")],
    ["vector-mutation", "call-effect", "branch"],
    ["layout not already present"],
    ["vector reallocation may invalidate element addresses; unique_ptr ownership preserves objects"],
    [e(D+"ffn_service.h", 471, "const auto bank = ranges::find_if(state.banks,"),
     e(D+"ffn_service.h", 475, "if (bank == state.banks.end()) {"),
     e(D+"ffn_service.h", 476, "state.banks.push_back(prepare_expert_bank(layout, model.layers.at(il)));")],
    {"function": "find_or_prepare_expert_bank", "statePath": ["state", "banks"]}))

rows.append(entry(
    "deepseek.ffn.prefill-cache-eviction", D+"ffn_service.h", 541, 5,
    "state.prefill_executions.push_back", "history", "Conditional",
    [t(D+"ffn_service.h", 539, "state.prefill_executions.erase(state.prefill_executions.begin());", "eviction"),
     t(D+"ffn_service.h", 541, "state.prefill_executions.push_back", "insertion"),
     t(D+"ffn_service.h", 466, "ffn_prefill_cache_capacity = 2", "capacity")],
    ["bounded-cache", "vector-mutation", "branch"],
    ["no matching cached execution", "cache capacity reached"],
    ["eviction destroys a prepared graph; downstream pointers to it become invalid"],
    [e(D+"ffn_service.h", 538, "if (state.prefill_executions.size() == ffn_prefill_cache_capacity) {"),
     e(D+"ffn_service.h", 541, "state.prefill_executions.push_back(std::make_unique<FfnPrefillExecution>(")],
    {"function": "prefill_execution", "statePath": ["state", "prefill_executions"]}))

rows.append(entry(
    "deepseek.ffn.execute.groups", D+"ffn_service.h", 560, 22,
    "const auto groups = ranges::fold_left(", "origin", "Boundary",
    [t(D+"ffn_service.h", 561, "ranges::views::iota(size_t{0}, request.n_tokens())", "range"),
     t(D+"ffn_service.h", 562, "Groups{}", "seed"),
     t(D+"ffn_service.h", 563, "groups[routing.experts[token]].push_back(token)", "dynamic-key-write")],
    ["fold-seed", "dynamic-key", "container-element-write"],
    ["runtime routing ids select the map key"],
    ["map key identity depends on remote routing; grouping is not statically unique"],
    [e(D+"ffn_service.h", 560, "const auto groups = ranges::fold_left("),
     e(D+"ffn_service.h", 563, "groups[routing.experts[token]].push_back(token);")],
    {"function": "execute_ffn", "statePath": ["groups"]}))

rows.append(entry(
    "deepseek.dsv4.routed.pure-graph", D+"dsv4_ffn.h", 118, 7,
    "ranges::views::iota(int64_t{1}, used)", "mutation", "Unsupported",
    [t(D+"dsv4_ffn.h", 118, "ranges::views::iota(int64_t{1}, used)", "range"),
     t(D+"dsv4_ffn.h", 119, "expert_view(0)", "seed"),
     t(D+"dsv4_ffn.h", 121, "ggml_add(ctx, sum, expert_view(slot))", "graph-node-accumulation")],
    ["graph-value", "no-C++-storage-mutation"],
    ["ggml graph construction only"],
    ["the accumulator is a ggml_tensor* graph node, not mutable C++ state; no object history exists"],
    [e(D+"dsv4_ffn.h", 117, "const auto routed = ranges::fold_left("),
     e(D+"dsv4_ffn.h", 121, "return ggml_add(ctx, sum, expert_view(slot));")],
    {"function": "build_routed", "statePath": ["routed"]},
    "Deliberate Unsupported: value/graph accumulation must not be reported as state mutation."))

# ---------------------------------------------------------------------------
# Resource ownership / graph cache
# ---------------------------------------------------------------------------
rows.append(entry(
    "minicpm.start_session.caches", C+"pipeline.h", 1247, 18,
    "auto caches = ranges::views::iota", "origin", "Exact",
    [t(C+"pipeline.h", 1249, "make_cache(model, compute, layer_index", "constructor"),
     t(C+"pipeline.h", 1252, "ranges::to<std::vector<LayerCache>>()", "conversion"),
     t(C+"pipeline.h", 1280, "std::move(caches)", "return")],
    ["fold-result", "constructor", "value-transfer"],
    [], ["make_cache allocates backend buffers; allocation identity comes from the external backend"],
    [e(C+"pipeline.h", 1247, "auto caches = ranges::views::iota("),
     e(C+"pipeline.h", 1249, "return make_cache(model, compute, layer_index,")],
    {"function": "Pipeline::start_session", "statePath": ["SessionState", "caches"]}))

rows.append(entry(
    "minicpm.start_session.bank_state", C+"pipeline.h", 1280, 30,
    "std::move(bank_state)", "origin", "Exact",
    [t(C+"pipeline.h", 1277, "make_bank(index, bank_context, shared_type, layer_bank_types)", "constructor"),
     t(C+"experts.h", 742, "apply_prewarm(const BankContext", "transform"),
     t(C+"pipeline.h", 1280, "std::move(bank_state)", "return")],
    ["call-return", "fold-result", "value-transfer"],
    ["prewarm table may be empty"],
    ["prewarm I/O completion is required for loaded records"],
    [e(C+"pipeline.h", 1275, "auto bank_state = apply_prewarm("),
     e(C+"experts.h", 809, "return {std::move(bank_state.shared_bank),")],
    {"function": "Pipeline::start_session", "statePath": ["SessionState", "bank_state"]}))

rows.append(entry(
    "minicpm.graph_cache.tick.recurrence", C+"pipeline.h", 882, 38,
    "graph_cache.tick", "history", "Conditional",
    [t(C+"pipeline.h", 861, "GraphCache graph_cache;", "field-declaration"),
     t(C+"pipeline.h", 869, "std::move(session_state.graph_cache)", "fold-seed"),
     t(C+"pipeline.h", 1209, "std::move(layer_execution.graph_cache)", "previous-batch-return")],
    ["field-increment", "whole-state-transfer", "branch"],
    ["layer == 0", "either cache hit or build path", "no earlier fold iteration reaches this branch"],
    ["the current hit/build increment is not a prior iteration; prior batches supply the seed"],
    [e(C+"pipeline.h", 882, "language_graphs_found->second->age = ++graph_cache.tick;"),
     e(C+"pipeline.h", 898, "language_graphs->age = ++graph_cache.tick;")],
    {"function": "Pipeline::execute::lambda", "statePath": ["graph_cache", "tick"],
     "foldSite": "pipeline.h:866"}))

rows.append(entry(
    "minicpm.ffn.retaining.pointer-fold", C+"ffn.h", 177, 10,
    "&bank_state.slots, &bank_state.counters.prewarm_from_prefill", "mutation", "Exact",
    [t(C+"ffn.h", 169, "SlotState *slots;", "pointer-field"),
     t(C+"ffn.h", 177, "&bank_state.slots", "address-of"),
     t(C+"ffn.h", 199, "retaining.slots->keys[target] = key", "pointee-write"),
     t(C+"ffn.h", 200, "retaining.slots->ages[target] = ++retaining.slots->tick", "pointee-write")],
    ["address-of", "pointer-alias", "aggregate-field", "fold"],
    ["hot candidates are non-empty", "a free or evictable target slot exists"],
    ["target index is dynamic but the pointee object is the caller's bank_state.slots"],
    [e(C+"ffn.h", 168, "struct Retaining {"),
     e(C+"ffn.h", 177, "&bank_state.slots, &bank_state.counters.prewarm_from_prefill, {},"),
     e(C+"ffn.h", 199, "retaining.slots->keys[target] = key;")],
    {"function": "retain_prefill", "statePath": ["bank_state", "slots"]},
    "The fold accumulator carries pointers, but the writes are still to the caller-owned State."))

FOLD_SITE_BY_ID = {
    "minicpm.execute.lambda.graph_reuses.history": "pipeline.h:866",
    "minicpm.execute.lambda.graph_builds.history": "pipeline.h:866",
    "minicpm.execute.pending.reset": "pipeline.h:866",
    "minicpm.execute.fold-result.bank_state": "pipeline.h:866",
    "minicpm.clear_session.bankstate.reconstruction": "pipeline.h:866",
    "minicpm.plan_shared_decode.seed.slots": "experts.h:407",
    "minicpm.plan_shared_decode.dynamic-index-write": "experts.h:407",
    "minicpm.plan_cache_decode.found.original-snapshot": "experts.h:469",
    "minicpm.plan_cache_decode.misses.history": "experts.h:469",
    "minicpm.apply_prewarm.bankstate.return": "experts.h:756",
    "minicpm.victim_slot.fold": "experts.h:353",
    "minicpm.record_frequency.element-write": "ffn.h:225",
    "minicpm.expert_io.read_state.seed": "expert_io.h:763",
    "minicpm.cli.generation.seed": "cli.cpp:518",
    "minicpm.cli.generation.batch_state.update": "cli.cpp:518",
    "minicpm.cli.generation.text": "cli.cpp:518",
    "minicpm.cli.generation.decode_tokens": "cli.cpp:518",
    "minicpm.cli.prefill.batch_state.seed": "cli.cpp:259",
    "deepseek.attention.cache.origin": "attention_pipeline.h:1713",
    "deepseek.attention.position.origin": "attention_pipeline.h:1713",
    "deepseek.attention.hidden.seed": "attention_pipeline.h:1713",
    "deepseek.attention.ffn-return": "attention_pipeline.h:1713",
    "deepseek.generation.current.origin": "attention_node.cpp:57",
    "deepseek.generation.next-state.origin": "attention_node.cpp:57",
    "deepseek.generation.finished.origin": "attention_node.cpp:57",
    "deepseek.ffn.server.state-fold": "ffn_service.h:670",
    "deepseek.ffn.execute.groups": "ffn_service.h:560",
    "deepseek.dsv4.routed.pure-graph": "dsv4_ffn.h:117",
    "minicpm.graph_cache.tick.recurrence": "pipeline.h:866",
    "minicpm.start_session.bank_state": "experts.h:756",
}
for r in rows:
    if r["id"] in FOLD_SITE_BY_ID:
        r["context"]["foldSite"] = FOLD_SITE_BY_ID[r["id"]]

# Anchor columns are derived from the actual source line, not from analyzer
# output.  This keeps the Oracle query stable while making the CLI column point
# at the intended expression.
for r in rows:
    q = r["query"]
    source = NANO / q["file"]
    try:
        text = source.read_text().splitlines()[q["line"] - 1]
        pos = text.find(q["anchor"])
        if pos >= 0:
            q["column"] = pos + 1
    except Exception:
        pass

DECL_ROLES = {
    "destination-member", "seed-aggregate", "record", "planning-field",
    "field-declaration", "field-layer", "field-keys", "field-slots",
    "field-issued", "field-ticket", "resource-pointer", "counter-field",
    "field", "fold-state-field", "preserved-resource", "reset-slots",
    "reset-frequencies", "reset-counters-and-pending", "BatchState-field",
    "SessionState-field", "alias-target",
}
for r in rows:
    for tgt in r["expectation"]["targets"]:
        if tgt.get("role") in DECL_ROLES:
            tgt["required"] = False

with OUT.open("w") as f:
    for r in rows:
        f.write(json.dumps(r, ensure_ascii=False) + "\n")
print("wrote", len(rows), "oracle entries")
print("kinds", {k: sum(1 for r in rows if r["expectation"]["kind"] == k)
                for k in ["Exact", "Multiple", "Conditional", "Boundary",
                          "Unsupported", "NoPriorMutation"]})
