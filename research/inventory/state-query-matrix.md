# State query matrix

Source sites: **10031**. This matrix is generated from the Clang event inventory, not from analyzer query results.

## Counts

| dimension | count |
|---|---|
| status:fold-context | 8161 |
| status:mechanical | 1763 |
| status:oracle | 107 |
| role:read/call-result | 3929 |
| role:read/declref | 1384 |
| role:read/member | 1072 |
| role:call | 777 |
| role:mutation/aggregate | 415 |
| role:value-transfer/move | 346 |
| role:mutation/init | 291 |
| role:mutation/call-effect | 251 |
| role:return/return-field | 175 |
| role:value-transfer/copy | 173 |
| role:mutation/assign | 148 |
| role:return/return | 144 |
| role:value-transfer/construct | 114 |
| role:read/variant-access | 100 |
| role:read/dependent-member | 97 |
| role:aggregate-value | 79 |
| role:capture/ | 63 |
| role:fold-seed | 59 |
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
| role:mutation/ctor-init | 12 |
| role:fold-result | 11 |
| role:lambda | 9 |
| role:read/compound-read | 9 |
| role:mutation/compound | 9 |
| role:forward | 1 |
| role:unknown-effect | 1 |

## Semantic coverage rules

- A site is included when its root/expression type belongs to the 47-record state-type closure, or it occurs in a fold lambda.
- `oracle` means a reviewed Oracle query is anchored there.
- `fold-context` means the site is in a fold lambda even if its type is scalar; it still needs seed/backedge interpretation.
- `mechanical` sites have no independent Oracle yet; they are not counted as reviewed.
- The full site list, including storage identity and modes, is in `state-query-matrix.json`.

## Top root types

- ``: 5560
- `BankState &`: 237
- `const time_point`: 143
- `minicpm::BankState`: 138
- `const BankContext`: 120
- `const nano::Compute`: 111
- `const minicpm::Pipeline`: 110
- `uint32_t`: 106
- `SessionState`: 92
- `auto`: 86
- `Planning`: 85
- `const BankContext &`: 82
- `Parsing`: 80
- `CacheDecodePlan`: 78
- `auto &`: 77
- `BankState`: 76
- `const size_t`: 70
- `U`: 69
- `const std::string`: 69
- `<dependent type>`: 57
