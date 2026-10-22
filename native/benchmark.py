#!/usr/bin/env python3
"""Measure native extraction and optionally compare its complete JSON contract.

python3 native/benchmark.py --baseline /tmp/fold-state-jump-ast-baseline
python3 native/benchmark.py --source test/fixtures/native-paths.cpp

Requires GNU time for the extractor's peak RSS. JSON parsing and contract
comparison run outside the measured extractor process. Declaration addresses
vary between processes, so comparison normalizes IDs while retaining their
reference relationships, every other field, and array order.
"""

import argparse
from functools import reduce
import json
from pathlib import Path
import statistics
import subprocess
from tempfile import TemporaryDirectory
from time import perf_counter


def normalize(value, identities):
    if isinstance(value, list):
        def item(state, value):
            items, identities = state
            items.append(normalize(value, identities))
            return state
        return reduce(item, value, ([], identities))[0]
    if isinstance(value, dict):
        def attribute(state, key):
            attributes, identities = state
            attributes[key] = (
                identities.setdefault(value[key], len(identities))
                if key in ("id", "referencedMemberDecl") and value[key]
                else normalize(value[key], identities)
            )
            return state
        return reduce(attribute, sorted(value), ({}, identities))[0]
    return value


def measure(executable, source, flags, repetitions, metrics):
    def sample(state, _):
        start = perf_counter()
        extraction = subprocess.run(
            [
                "/usr/bin/time", "--output", str(metrics), "--format", "%M",
                str(executable), "--source", str(source), "--", *flags,
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        duration = (perf_counter() - start) * 1000
        if extraction.returncode:
            raise SystemExit(extraction.stderr.decode(errors="replace"))
        return {
            "samplesMs": (*state["samplesMs"], duration),
            "maxRssKiB": max(state["maxRssKiB"], int(metrics.read_text())),
            "output": extraction.stdout,
        }

    measurement = reduce(
        sample, range(repetitions), {"samplesMs": (), "maxRssKiB": 0}
    )
    return {
        "medianMs": statistics.median(measurement["samplesMs"]),
        "samplesMs": measurement["samplesMs"],
        "maxRssKiB": measurement["maxRssKiB"],
        "jsonBytes": len(measurement["output"]),
    }, json.loads(measurement["output"])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--executable", default="native/build/fold-state-jump-ast")
    parser.add_argument("--baseline")
    parser.add_argument("--source")
    parser.add_argument("--functions", type=int, default=3000)
    parser.add_argument("--repetitions", type=int, default=5)
    parser.add_argument("clang_flags", nargs=argparse.REMAINDER)
    options = parser.parse_args()
    if options.functions < 1 or options.repetitions < 1:
        parser.error("--functions and --repetitions must be positive")
    if not Path("/usr/bin/time").exists():
        parser.error("GNU /usr/bin/time is required for peak RSS measurement")

    flags = options.clang_flags or ["-std=c++17"]
    flags = flags[1:] if flags[0] == "--" else flags
    executable = Path(options.executable).resolve()
    if not executable.is_file():
        parser.error("Build the extractor first: bun run build:native")

    with TemporaryDirectory(prefix="fold-state-jump-native-") as directory:
        directory = Path(directory)
        source = Path(options.source).resolve() if options.source else directory / "source.cpp"
        if not options.source:
            source.write_text(
                "#include <vector>\nstruct State { int value = 0; };\n" +
                "\n".join(map(
                    lambda index: f"void function_{index}(State &state) {{ state.value += {index}; if (state.value) ++state.value; }}",
                    range(options.functions),
                ))
            )
        metrics = directory / "rss.txt"
        current, current_ast = measure(
            executable, source, flags, options.repetitions, metrics
        )
        baseline = (
            measure(Path(options.baseline).resolve(), source, flags, options.repetitions, metrics)
            if options.baseline else None
        )
        if baseline and normalize(current_ast, {}) != normalize(baseline[1], {}):
            raise SystemExit("Extracted JSON contract differs from the baseline")
        print(json.dumps({
            "source": str(source) if options.source else f"synthetic: {options.functions} functions",
            "current": current,
            **({
                "baseline": baseline[0],
                "speedup": baseline[0]["medianMs"] / current["medianMs"],
                "rssReductionPercent": 100 * (1 - current["maxRssKiB"] / baseline[0]["maxRssKiB"]),
                "jsonContractIdentical": True,
            } if baseline else {}),
        }, indent=2))


if __name__ == "__main__":
    main()
