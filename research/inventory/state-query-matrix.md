# State query matrix

Source sites: **8788**. This matrix is generated from the Clang event inventory, not from analyzer query results.

## Counts

| dimension | count |
|---|---|
| status:fold-context | 6963 |
| status:mechanical | 1722 |
| status:oracle | 103 |
| role:read/call-result | 3853 |
| role:read/declref | 1392 |
| role:read/member | 1107 |
| role:mutation/init | 360 |
| role:value-transfer/move | 343 |
| role:mutation/call-effect | 251 |
| role:return/return-field | 173 |
| role:value-transfer/copy | 172 |
| role:return/return | 144 |
| role:value-transfer/construct | 114 |
| role:read/variant-access | 100 |
| role:read/dependent-member | 97 |
| role:aggregate-value | 81 |
| role:mutation/assign | 64 |
| role:fold-seed | 59 |
| role:capture/reference | 49 |
| role:read/operator-arrow | 46 |
| role:read/operator-deref | 42 |
| role:alias-binding | 41 |
| role:read/accessor | 37 |
| role:mutation/method-mutation | 32 |
| role:read/increment | 30 |
| role:mutation/increment | 30 |
| role:read/subscript | 25 |
| role:address-of | 21 |
| role:read/cast | 21 |
| role:read/deref | 20 |
| role:select | 17 |
| role:capture/ | 16 |
| role:mutation/ctor-init | 12 |
| role:fold-result | 11 |
| role:lambda | 9 |
| role:read/compound-read | 8 |
| role:mutation/compound | 8 |
| role:call | 1 |
| role:forward | 1 |
| role:unknown-effect | 1 |

## Semantic coverage rules

- A site is included when its root/expression type belongs to the 47-record state-type closure, or it occurs in a fold lambda.
- `oracle` means a reviewed Oracle query is anchored there.
- `fold-context` means the site is in a fold lambda even if its type is scalar; it still needs seed/backedge interpretation.
- `mechanical` sites have no independent Oracle yet; they are not counted as reviewed.
- The full site list, including storage identity and modes, is in `state-query-matrix.json`.

## Top root types

- ``: 4646
- `BankState &`: 177
- `const time_point`: 143
- `minicpm::BankState`: 127
- `const BankContext`: 120
- `const nano::Compute`: 111
- `const minicpm::Pipeline`: 110
- `uint32_t`: 106
- `auto`: 84
- `const BankContext &`: 82
- `SessionState`: 74
- `Planning`: 73
- `const size_t`: 70
- `const std::string`: 69
- `auto &`: 69
- `BankState`: 63
- `CacheDecodePlan`: 62
- `<dependent type>`: 55
- `const auto`: 54
- `U`: 53
