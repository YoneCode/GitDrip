# GitDrip

**On-chain open-source sponsorship splitter, scored by AI validators on
[GenLayer](https://genlayer.com).**

Sponsors fund a repo. Contributors push commits. Each cycle, the
GitDrip intelligent contract asks GenLayer's validator network to score
every contributor's commits — features and refactors weigh more than
typo fixes, bots score zero — and the sponsor pool splits along that
verdict. No human signs the payout.

This works because GenLayer's _equivalence principle_ lets every
validator independently call an LLM, and the network only accepts a
state transition when their verdicts converge. The scoring rubric is
literal Python in the contract:

```python
verdict = gl.eq_principle.prompt_non_comparative(
    fetch_diffs,
    task="Score each contributor 0..100 by commit substance.",
    criteria=("Bots score 0. Whitespace ≤ 5. "
              "Real bug fixes 20-40. Features 40-80. "
              "Major architecture 80-100."),
)
```

Live on Bradbury testnet (chain id 4221).

| | |
|---|---|
| **Contract** | `0x725A57f7ED354eD124812DB9349483095dd38d99` |
| **Deploy tx** | `0xbc563a7d0fec0d3fc7ea2ab33304bd09db69052bcc684b6a1aa96b8981fadf23` |
| **Test repo** | [`alnamodevloper/gitdrip-demo`](https://github.com/alnamodevloper/gitdrip-demo) |

## Repo layout

```
contract/   intelligent contract (gitdrip.py) + direct tests (gltest)
frontend/   Next.js dApp — register, sponsor, enroll, claim, dashboard
scripts/    helper scripts (sign-write, webhook-relay)
video/      71-second 1080p60 product video built with Remotion
docs/       submission tracker for the GenLayer Builder Portal
```

## Run it locally

### 1. Bring up the contract toolchain

```sh
python -m venv .venv && . .envrc
pip install -r contract/requirements.txt
pytest contract/tests/direct -v          # 100% direct-mode tests
```

### 2. Bring up the dApp

```sh
cd frontend
cp ../.env.example ../.env               # then fill in real values
npm install
npm run dev                              # http://localhost:3000
```

### 3. Render the demo video (optional)

```sh
cd video
npm install
npm run render                           # writes gitdrip-demo.mp4
```

## How it works

1. **Maintainer registers a repo.** The contract calls
   `gl.eq_principle.prompt_non_comparative` to verify the repo's
   `.gitdrip.json` declares the sender's wallet.
2. **Sponsors deposit GLT** against the repo. Funds sit in escrow.
3. **Contributors enroll** by pushing a verifiable commit that proves
   their GitHub login matches the wallet that's enrolling.
4. **Each cycle, anyone calls `distribute(...)`.** The contract pulls
   each contributor's commit list, hands the diffs to the validators,
   and each validator independently runs an LLM that scores 0..100 by
   substance. Validators must reach quorum on the score map for the
   transaction to land.
5. **The pool splits proportional to scores** — winners can call
   `claim()` to sweep their share. There's no admin signature, no
   manual override.

## Stack

- **Contract:** Python (`gl.Contract`) on GenLayer's GenVM
- **dApp:** Next.js + Tailwind + viem + a wallet provider
- **Tests:** `gltest` direct mode for the contract, Vitest + Playwright
  for the frontend
- **Video:** Remotion @ 1920×1080 / 60 fps

## License

Apache 2.0 — see `LICENSE`.

The Mochi mascot in `video/public/mochi/` is vendored from the GenLayer
mascot repo under CC0; see `video/public/mochi/VENDORED.md`.
