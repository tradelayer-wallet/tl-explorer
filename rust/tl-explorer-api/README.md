# tl-explorer-api: Rust contract layer for tl-explorer (RUST-05)

Baseline: `tradelayer-wallet/tl-explorer` master `16e0b51aecbb86986911cb1ee1d5fa2c7f65841b`.
Inspected: `src/app/@core/api/tl-api.service.ts` (blob `9142a61`), all `@core/services`,
`@components/property-types.ts` (`da27d70`), `possible-link`, `list-table` and
`collection-table` components, `app.component.ts` (search), `app-routing.module.ts`
(`9181a14`), `environments/*`, `mock-api/server.js` (`3993ee0`) and `mock-api/data`.
Branch `origin/sk-x1` (371894c "txdata updates") was not merged into this baseline.

## Ownership finding

tl-explorer is a client-side Angular application. It has no backend of its own:
production calls `https://172.81.181.19:9191` (the orderbook/collator host), and
development calls `http://localhost:3000` or the file-backed `mock-api`. The service
that answers `/tl_*`, `/token/*`, `/contracts/*` and `/addresses/*` is not in this
repository, so a Rust API/indexer is out of scope until that backend's owner is
established (charter M4). This crate ports the contract the client relies on.

## Port

| Legacy | Rust |
|---|---|
| `TradeLayerApi` methods (20 calls) | `Endpoint` variants and `Endpoint::path` |
| route parameters (`address`, `txid`, ids, block ranges) | `Address`, `Txid`, `parse_u64`, `Endpoint::ltc_volume` |
| `app-routing.module.ts` | `Page::parse` / `Page::path` (`None` = `**` error page) |
| `AppComponent.search` | `search` |
| `PropertyToPropertyType`, `getLinkFromPropertyType`, `PossibleLinkComponent` | `link_type_of`, `link_for`, `external_href` |
| `mock-api/server.js` path mapping | `mock_file` |
| `PropertyCacheType` | `PropertyCacheType` |

## Compatibility table

| Behavior | Legacy | Rust | Class |
|---|---|---|---|
| API paths for valid parameters | template strings | byte-identical | preserved contract |
| Route parameters | raw strings interpolated into API paths and router links (`../x`, `a/b`, `?q` reach the backend) | typed, single-segment, validated | repaired defect (open PR #10 covers the TypeScript side) |
| Search | 64 chars → tx; `parseInt` prefix → block; else address (`3J98…` → block 3, `12abc` → block 12) | 64 hex → tx; canonical digits → block; alphanumeric → address; else nothing | repaired defect |
| External `url` links | `value.startsWith('http') ? value : 'https://'+value`, `target=_blank`, no `rel` (`httpx://`, userinfo hosts accepted) | http(s) only, DNS host, no userinfo/whitespace/quotes; caller adds `rel="noopener noreferrer"` | repaired defect |
| Internal links from response fields | any value | only values that form a valid page | repaired defect |
| Mock API | `__dirname + '/data' + req.url` with no traversal check | segments must be safe and never `.`/`..` | repaired defect |
| `getPropCache` cache type | parameter ignored (query commented out) | ignored, recorded | preserved contract |
| `getPropLtcVolume` range | unchecked | `start <= end` | repaired defect |
| Errors | navigate to `/error?message=<raw error>` | not ported (UI) | unresolved question (reflecting backend error text in the UI) |
| Production API on a raw IP over HTTPS | `https://172.81.181.19:9191` | not configured here | unresolved question (certificate/hostname, backend owner) |

## Verification

    cargo test --locked --offline          # 8 tests, std only
    cargo clippy --locked --offline --all-targets -- -D warnings
    cargo fmt --all -- --check
    cd lean && lake build && lake env lean AxiomCheck.lean

`committed_mock_fixtures_resolve` checks that the repository's own `mock-api/data`
files are reachable through `mock_file`.

`lean/` (Lean 4 v4.34.1, core only) models paths as byte lists:

| Theorem | Statement |
|---|---|
| `splitAux_append`, `split_join` | splitting a `/`-joined list of slash-free segments returns exactly those segments |
| `validParam_no_slash` | a valid parameter contains no `/`, so it is exactly one segment |
| `parse_path` | every valid page parses back from its own path |
| `parse_valid` | a parsed page always carries a valid parameter |
| `mockOk_no_traversal` | an accepted mock path has no empty, `.` or `..` segment and no `/` inside a segment |

`decide` examples replay the injected-slash and empty-parameter cases of
`page_routes_round_trip` and the traversal cases of `mock_api_paths_stay_inside_data`.

## Not done

- No response models: response shapes belong to the unidentified backend.
- The Angular UI is unchanged; adopting these rules there is the TypeScript PR #10's job.
- CI workflow `.github/workflows/rust-tl-explorer-api.yml` has not run (not pushed).
