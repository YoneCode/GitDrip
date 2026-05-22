# GitDrip — Contract (Phase 1)

Intelligent contract for [GitDrip](../idea4.md): on-chain open-source
sponsorship splitter with AI-judged contributor scoring.

## Layout

```
contracts/gitdrip.py          # the contract (single file)
tests/direct/                 # fast in-process tests (no simulator needed)
  conftest.py                 # mocks for web + LLM + ExecPromptTemplate
  test_gitdrip.py             # 20 tests covering the full lifecycle
requirements.txt              # pinned Python deps
```

## Setup

The host must have **Python 3.12** (genlayer-py 0.3.0+ requires
`collections.abc.Buffer`). One way:

```bash
# install python 3.12 (uv works on any distro)
curl -LsSf https://astral.sh/uv/install.sh | sh
uv python install 3.12

# create venv on 3.12
"$(uv python find 3.12)" -m venv .venv
. .venv/bin/activate

# project deps
pip install -r contract/requirements.txt

# genlayer CLI (for deployment later)
mkdir -p "$HOME/.npm-global"
npm config set prefix "$HOME/.npm-global"
npm install -g genlayer
```

The `genvm-lint` validate path needs an SDK on disk. The latest GitHub
release (`v0.3.0-rc0`) returns 404 on `genvm-universal.tar.xz`, so we pin
to **v0.2.12** and expose it via `GENVMROOT`:

```bash
genvm-lint download --version v0.2.12        # ~210 MB tarball
mkdir -p ~/.cache/genvm-shared/runners/py-lib-genlayer-std
# extract just the std runner from the tarball into that dir
# (one-shot setup script left as an exercise; this session did it manually)

# every shell:
source .envrc
```

## Common commands

```bash
# lint + validate the contract
genvm-lint check contract/contracts/gitdrip.py

# direct-mode tests (fast, no simulator)
pytest contract/tests/direct/ -v

# extract ABI
genvm-lint schema contract/contracts/gitdrip.py
```

## Phase 1 status

- ✅ Toolchain: `genvm-linter 0.10.0`, `genlayer-test 0.29.2`, `genlayer 0.39.1`.
- ✅ Lint: 3 checks pass; SDK validation passes; 13 methods (6 view, 7 write).
- ✅ Direct tests: 20/20 pass in 0.5 s.
- ⏳ Deployment to Bradbury — requires a funded testnet wallet; run
  `genlayer network set testnet-bradbury && genlayer deploy --contract
  contract/contracts/gitdrip.py` once funded.

## Notes for next session

1. The contract class is named **`GitDrip`** (not `Contract`) — `genvm-lint`'s
   validator skips classes literally called `Contract`.
2. Pinned runner header:
   `# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }`.
3. The direct-mode wasi mock does **not** know about `ExecPromptTemplate`
   (the SDK uses it inside `gl.eq_principle.prompt_non_comparative`).
   `tests/direct/conftest.py` installs a `_gl_call_hook` that intercepts
   the `EqNonComparativeLeader` template and returns the mocked verdict.
4. `vm.warp(iso)` only patches `datetime.datetime.now()`, not
   `gl.message_raw["datetime"]`. The contract reads block time from
   `gl.message_raw`, so the conftest also patches `vm.warp` to update
   that dict.
