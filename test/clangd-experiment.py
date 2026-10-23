#!/usr/bin/env python3
"""Inspect clangd's real nonstandard AST response in an isolated LSP process."""
from functools import reduce
import json
from pathlib import Path
import subprocess
import sys

source = Path(sys.argv[1] if len(sys.argv) > 1 else 'test/fixtures/native-paths.cpp').resolve()
clangd = sys.argv[2] if len(sys.argv) > 2 else '/usr/lib/llvm-23/bin/clangd'
process = subprocess.Popen([clangd, '--background-index=0', '--clang-tidy=0', '--enable-config=0', '--log=error'],
    stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)

def send(value):
    body = json.dumps(value).encode()
    process.stdin.write(f'Content-Length: {len(body)}\r\n\r\n'.encode() + body)
    process.stdin.flush()

def headers(state):
    line = process.stdout.readline()
    if not line: raise RuntimeError('clangd exited before responding')
    return state if line == b'\r\n' else headers({**state, **dict([line.decode().strip().split(': ', 1)])})

def receive(identifier):
    message = json.loads(process.stdout.read(int(headers({})['Content-Length'])))
    return message if message.get('id') == identifier else receive(identifier)

try:
    send({'jsonrpc': '2.0', 'id': 1, 'method': 'initialize', 'params': {'processId': None,
        'rootUri': source.parent.as_uri(), 'capabilities': {}, 'initializationOptions': {'fallbackFlags': ['-std=c++20']}}})
    initialized = receive(1)
    send({'jsonrpc': '2.0', 'method': 'initialized', 'params': {}})
    text = source.read_text()
    send({'jsonrpc': '2.0', 'method': 'textDocument/didOpen', 'params': {'textDocument': {
        'uri': source.as_uri(), 'languageId': 'cpp', 'version': 1, 'text': text}}})
    offset = text.index('bank_state.bank.records')
    line = text[:offset].count('\n')
    column = offset - (text.rfind('\n', 0, offset) + 1)
    send({'jsonrpc': '2.0', 'id': 2, 'method': 'textDocument/ast', 'params': {
        'textDocument': {'uri': source.as_uri()}, 'range': {'start': {'line': line, 'character': column},
        'end': {'line': line, 'character': column + len('bank_state.bank.records')}}}})
    response = receive(2)
    def flatten(node):
        return [node, *reduce(lambda nodes, child: [*nodes, *flatten(child)], node.get('children', []), [])]
    result = response.get('result') or {}
    nodes = flatten(result)
    print(json.dumps({'version': subprocess.check_output([clangd, '--version']).decode().strip(),
        'source': str(source), 'astProvider': initialized.get('result', {}).get('capabilities', {}).get('astProvider'),
        'error': response.get('error'), 'bytes': len(json.dumps(response)), 'nodes': len(nodes),
        'fields': sorted(set(reduce(lambda fields, node: [*fields, *node.keys()], nodes, []))),
        'response': response}, indent=2))
    send({'jsonrpc': '2.0', 'id': 3, 'method': 'shutdown', 'params': None})
    receive(3)
    send({'jsonrpc': '2.0', 'method': 'exit'})
    process.wait(timeout=10)
finally:
    if process.poll() is None: process.kill(); process.wait()
