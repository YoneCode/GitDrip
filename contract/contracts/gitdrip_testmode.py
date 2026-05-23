# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""
GitDrip — On-chain open source sponsorship splitter with AI substance scoring.

Maintainers register a public GitHub repo by committing a `.gitdrip.json` file
that declares their wallet. Sponsors deposit GEN into the repo's pool. Periodic
distributions fetch each opted-in contributor's commit diffs from the GitHub
API and score them with an LLM via the equivalence principle. Pool funds are
credited to contributors' pending balances; contributors call `claim()` to
withdraw (pull pattern).

Design source-of-truth: idea4.md §7 (Contract Code) and §2 (Threat Model).
"""

from genlayer import *

import json
from datetime import datetime, timezone


# ---------------------------------------------------------------------------
# Error prefixes — see write-contract skill "Error Classification".
# Validators compare leader/validator errors using these tags so that
# deterministic failures (EXPECTED) require exact match while LLM errors
# force consensus rotation.
# ---------------------------------------------------------------------------
ERR_EXPECTED = "[EXPECTED]"
ERR_EXTERNAL = "[EXTERNAL]"
ERR_LLM = "[LLM_ERROR]"


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
MIN_PERIOD_SEC = 0          # TEST-MODE override
DORMANT_REFUND_SEC = 0   # TEST-MODE override
MAX_CONTRIBUTORS_PER_REPO = 50          # bounds prompt size
MAX_COMMITS_PER_CONTRIBUTOR = 20        # bounds prompt size
MAX_DIFF_CHARS = 1500                   # per-commit patch truncation
MAX_PROMPT_PAYLOAD_BYTES = 14000        # cap on serialized payload in prompt
MIN_SPONSOR_WEI = 10 * 10**18           # T8 — minimum sponsor deposit: 10 GEN


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _now_unix() -> int:
    """Current block time as a unix int.

    GenLayer exposes the message datetime as ISO-8601 in `gl.message_raw`.
    Convert once and store an int so storage stays simple.
    """
    iso = gl.message_raw["datetime"]
    if iso.endswith("Z"):
        iso = iso[:-1] + "+00:00"
    return int(datetime.fromisoformat(iso).timestamp())


def _iso_from_unix(ts: int) -> str:
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _wallet_str(addr) -> str:
    """Canonical lowercase 0x-hex wallet representation (used as TreeMap key)."""
    if isinstance(addr, Address):
        return addr.as_hex.lower()
    return str(addr).lower()


def _coerce_score(value, lo: int = 0, hi: int = 100) -> int:
    """LLMs sometimes return scores as strings, floats, or null. Coerce safely."""
    if value is None:
        return lo
    try:
        iv = int(round(float(value)))
    except (ValueError, TypeError):
        return lo
    if iv < lo:
        return lo
    if iv > hi:
        return hi
    return iv


# ---------------------------------------------------------------------------
# Contract
# ---------------------------------------------------------------------------
class GitDripTestMode(gl.Contract):
    # repo_slug ("owner/repo") -> JSON record
    repos: TreeMap[str, str]
    # repo_slug -> JSON {github_login: wallet_hex}
    enrolled: TreeMap[str, str]
    # wallet_hex -> claimable_wei (decimal-string, big-int-safe)
    pending: TreeMap[str, str]
    # deposit_id -> JSON {repo, sponsor, amount, ts, refunded}
    deposits: TreeMap[u256, str]
    next_deposit_id: u256
    # f"{repo_slug}:{distribution_index}" -> JSON scoring snapshot (T11)
    score_log: TreeMap[str, str]

    def __init__(self):
        self.next_deposit_id = u256(0)

    # ---- REGISTRATION (T2, T7, T10) -------------------------------------
    @gl.public.write
    def register_repo(self, repo_slug: str, github_token_hint: str) -> str:
        """Maintainer registers their repo.

        They MUST have committed `.gitdrip.json` to the default branch root
        with `{"maintainer_wallet": "<their wallet>"}`. The contract fetches
        the file via raw.githubusercontent.com and verifies the wallet matches
        `gl.message.sender_address`. The maintainer wallet stored on-chain is
        immutable after registration (T10).

        github_token_hint: optional public read-only fine-grained token, used
        as a query-string identifier so an off-chain proxy can supply higher
        rate limits during scoring (T7). Pass empty string for unauth.
        """
        if repo_slug in self.repos:
            raise gl.vm.UserError(f"{ERR_EXPECTED} already_registered")

        sender = _wallet_str(gl.message.sender_address)
        proof_url = (
            f"https://raw.githubusercontent.com/{repo_slug}/HEAD/.gitdrip.json"
        )

        def fetch_ownership() -> str:
            try:
                resp = gl.nondet.web.get(proof_url)
            except Exception:
                return json.dumps(
                    {"ok": False, "reason": "fetch_failed"},
                    sort_keys=True,
                )
            if resp.status >= 400:
                return json.dumps(
                    {"ok": False, "reason": f"http_{resp.status}"},
                    sort_keys=True,
                )
            try:
                body = (resp.body or b"").decode("utf-8")
                parsed = json.loads(body)
                wallet = str(parsed.get("maintainer_wallet", "")).lower()
                return json.dumps(
                    {
                        "ok": wallet == sender,
                        "wallet_in_file": wallet,
                        "claimed_by": sender,
                    },
                    sort_keys=True,
                )
            except Exception:
                return json.dumps(
                    {"ok": False, "reason": "bad_json"},
                    sort_keys=True,
                )

        verdict_str = gl.eq_principle.prompt_non_comparative(
            fetch_ownership,
            task=(
                "Decide if the repository's .gitdrip.json file declares the "
                "sender's wallet as its maintainer_wallet."
            ),
            criteria=(
                "Output JSON must contain 'ok' (boolean). 'ok' must be true "
                "only if the field maintainer_wallet in the file equals "
                "claimed_by (case-insensitive)."
            ),
        )
        try:
            verdict = json.loads(verdict_str)
        except Exception:
            raise gl.vm.UserError(f"{ERR_LLM} ownership_verdict_not_json")
        if verdict.get("ok") is not True:
            raise gl.vm.UserError(f"{ERR_EXPECTED} ownership_proof_failed")

        record = {
            "maintainer": sender,
            "github_token_hint": github_token_hint,
            "pool_wei": "0",
            "period_start_unix": _now_unix(),
            "last_distribution_unix": 0,
            "total_distributed_wei": "0",
            "distribution_count": 0,
            "last_release_tag": "",
        }
        self.repos[repo_slug] = json.dumps(record, sort_keys=True)
        self.enrolled[repo_slug] = json.dumps({})
        return "registered"

    # ---- CONTRIBUTOR OPT-IN (T1) ----------------------------------------
    @gl.public.write
    def enroll_contributor(
        self, repo_slug: str, github_login: str, gist_id: str
    ) -> str:
        """Contributor proves they control a GitHub login.

        They publish a public gist owned by `github_login` whose body contains
        `gitdrip:<repo_slug>:<wallet>` exactly. The contract fetches the gist
        and refuses if the gist owner differs or the body is missing.
        """
        if repo_slug not in self.repos:
            raise gl.vm.UserError(f"{ERR_EXPECTED} no_repo")

        sender = _wallet_str(gl.message.sender_address)
        expected_body = f"gitdrip:{repo_slug}:{sender}"
        gist_url = f"https://api.github.com/gists/{gist_id}"

        def fetch_opt_in() -> str:
            try:
                resp = gl.nondet.web.get(gist_url)
            except Exception:
                return json.dumps(
                    {"ok": False, "reason": "fetch_failed"},
                    sort_keys=True,
                )
            if resp.status >= 400:
                return json.dumps(
                    {"ok": False, "reason": f"http_{resp.status}"},
                    sort_keys=True,
                )
            try:
                body = (resp.body or b"").decode("utf-8")
                gist = json.loads(body)
                owner = ((gist.get("owner") or {}).get("login") or "").lower()
                files = gist.get("files") or {}
                content_match = False
                for f in files.values():
                    content = (f.get("content") or "").strip()
                    if expected_body in content:
                        content_match = True
                        break
                ok = owner == github_login.lower() and content_match
                return json.dumps(
                    {
                        "ok": ok,
                        "owner": owner,
                        "expected_login": github_login.lower(),
                        "expected_body": expected_body,
                    },
                    sort_keys=True,
                )
            except Exception:
                return json.dumps(
                    {"ok": False, "reason": "bad_json"},
                    sort_keys=True,
                )

        verdict_str = gl.eq_principle.prompt_non_comparative(
            fetch_opt_in,
            task=(
                "Decide if a public Gist proves that GitHub user "
                "expected_login controls the wallet referenced in expected_body."
            ),
            criteria=(
                "Output JSON must contain {'ok': bool}. 'ok' must be true only "
                "if the gist's owner.login equals expected_login AND at least "
                "one file in the gist contains expected_body verbatim."
            ),
        )
        try:
            verdict = json.loads(verdict_str)
        except Exception:
            raise gl.vm.UserError(f"{ERR_LLM} opt_in_verdict_not_json")
        if verdict.get("ok") is not True:
            raise gl.vm.UserError(f"{ERR_EXPECTED} opt_in_proof_failed")

        roster = json.loads(self.enrolled[repo_slug])
        if len(roster) >= MAX_CONTRIBUTORS_PER_REPO:
            raise gl.vm.UserError(f"{ERR_EXPECTED} roster_full")
        roster[github_login.lower()] = sender
        self.enrolled[repo_slug] = json.dumps(roster, sort_keys=True)
        return "enrolled"

    # ---- SPONSORSHIP (T8, T9) -------------------------------------------
    @gl.public.write.payable
    def sponsor(self, repo_slug: str) -> u256:
        """Sponsor adds GEN to the repo pool.

        Each deposit is tracked individually so a sponsor can later call
        `sponsor_refund(deposit_id)` if the repo goes dormant (T8).

        Minimum deposit: 10 GEN (MIN_SPONSOR_WEI).
        """
        if repo_slug not in self.repos:
            raise gl.vm.UserError(f"{ERR_EXPECTED} no_repo")

        amount = int(gl.message.value)
        if amount < MIN_SPONSOR_WEI:
            raise gl.vm.UserError(f"{ERR_EXPECTED} below_min")

        record = json.loads(self.repos[repo_slug])
        record["pool_wei"] = str(int(record["pool_wei"]) + amount)
        self.repos[repo_slug] = json.dumps(record, sort_keys=True)

        deposit_id = self.next_deposit_id
        self.next_deposit_id = u256(int(self.next_deposit_id) + 1)
        sender = _wallet_str(gl.message.sender_address)
        self.deposits[deposit_id] = json.dumps(
            {
                "repo": repo_slug,
                "sponsor": sender,
                "amount": str(amount),
                "ts": _now_unix(),
                "refunded": False,
            },
            sort_keys=True,
        )
        return deposit_id

    # ---- DISTRIBUTION (T3, T4, T5, T6, T7, T11) -------------------------
    @gl.public.write
    def distribute(self, repo_slug: str) -> str:
        """Standard periodic distribution. Enforces 7-day minimum (T5)."""
        return self._distribute(repo_slug, release_tag="")

    @gl.public.write
    def distribute_on_release(self, repo_slug: str, tag: str) -> str:
        """Alternate trigger: any time, but only once per release tag (T5)."""
        if not tag:
            raise gl.vm.UserError(f"{ERR_EXPECTED} tag_required")
        if repo_slug not in self.repos:
            raise gl.vm.UserError(f"{ERR_EXPECTED} no_repo")
        record = json.loads(self.repos[repo_slug])
        if record.get("last_release_tag") == tag:
            raise gl.vm.UserError(f"{ERR_EXPECTED} release_already_distributed")
        result = self._distribute(repo_slug, release_tag=tag)
        if result.startswith("distributed_"):
            record = json.loads(self.repos[repo_slug])
            record["last_release_tag"] = tag
            self.repos[repo_slug] = json.dumps(record, sort_keys=True)
        return result

    def _distribute(self, repo_slug: str, release_tag: str) -> str:
        if repo_slug not in self.repos:
            raise gl.vm.UserError(f"{ERR_EXPECTED} no_repo")
        record = json.loads(self.repos[repo_slug])
        pool = int(record["pool_wei"])
        if pool == 0:
            return "empty_pool"

        now = _now_unix()
        last = int(record["last_distribution_unix"] or record["period_start_unix"])
        # T5 — minimum period between distributions, unless triggered by a
        # unique release tag.
        if release_tag == "" and now - last < MIN_PERIOD_SEC:
            raise gl.vm.UserError(f"{ERR_EXPECTED} period_too_short")

        roster = json.loads(self.enrolled[repo_slug])
        if not roster:
            return "no_enrolled_contributors"

        token_hint = record.get("github_token_hint", "")
        logins = sorted(roster.keys())
        since_iso = _iso_from_unix(last)
        until_iso = _iso_from_unix(now)

        def score() -> str:
            payload: dict = {}
            for login in logins:
                commits_url = (
                    f"https://api.github.com/repos/{repo_slug}/commits"
                    f"?since={since_iso}&until={until_iso}&author={login}"
                    f"&per_page={MAX_COMMITS_PER_CONTRIBUTOR}"
                )
                if token_hint:
                    commits_url += f"&_t={token_hint}"
                try:
                    commits_resp = gl.nondet.web.get(commits_url)
                    body = (commits_resp.body or b"[]").decode("utf-8")
                    commits = json.loads(body) if commits_resp.status < 400 else []
                    if not isinstance(commits, list):
                        commits = []
                except Exception:
                    commits = []

                summary = []
                for c in commits[:MAX_COMMITS_PER_CONTRIBUTOR]:
                    sha = (c.get("sha") or "")[:40]
                    author = c.get("author") or {}
                    is_bot = author.get("type") == "Bot"  # T4
                    msg = ((c.get("commit") or {}).get("message") or "")[:200]

                    additions, deletions, patch_sample = 0, 0, ""
                    try:
                        detail_resp = gl.nondet.web.get(
                            f"https://api.github.com/repos/{repo_slug}/commits/{sha}"
                        )
                        if detail_resp.status < 400:
                            detail = json.loads(
                                (detail_resp.body or b"{}").decode("utf-8")
                            )
                            stats = detail.get("stats") or {}
                            additions = int(stats.get("additions", 0))
                            deletions = int(stats.get("deletions", 0))
                            chunks = []
                            for f in (detail.get("files") or [])[:3]:
                                chunks.append((f.get("patch") or "")[:MAX_DIFF_CHARS])
                                chunks.append("\n---\n")
                            patch_sample = "".join(chunks)[:MAX_DIFF_CHARS]
                    except Exception:
                        pass

                    summary.append(
                        {
                            "sha": sha[:7],
                            "is_bot": is_bot,
                            "message": msg,
                            "additions": additions,
                            "deletions": deletions,
                            "patch_sample": patch_sample,
                        }
                    )
                payload[login] = summary

            payload_str = json.dumps(payload, sort_keys=True)[
                :MAX_PROMPT_PAYLOAD_BYTES
            ]
            prompt = (
                "You score open-source contributors for a sponsorship distribution.\n\n"
                f"Repo: {repo_slug}\n"
                f"Period: {since_iso} -> {until_iso}\n"
                "Per-contributor commits with diff samples (JSON, truncated):\n"
                f"{payload_str}\n\n"
                "Scoring rubric (0-100 per contributor; the sum across "
                "contributors does not need to be 100):\n"
                "- ALL commits have is_bot == true -> score = 0\n"
                "- Only whitespace / comment / formatting changes "
                "(patch dominated by + and - of blanks or '#'/'//' lines) -> 1 to 5\n"
                "- 'Update README' / 'fix typo' tiny commits with <10 additions -> 5 to 10\n"
                "- Real bug fixes with meaningful code changes -> 20 to 40\n"
                "- Features, refactors, tests, non-trivial docs improvements -> 40 to 80\n"
                "- Major architecture / new subsystems / large coherent additions -> 80 to 100\n"
                "- A contributor with zero non-bot commits in the window -> 0\n\n"
                "Return ONLY this JSON, keys sorted alphabetically, no commentary:\n"
                "{\"<login>\": <int 0-100>, ...}\n"
                "Every login from the input MUST appear in the output exactly once."
            )

            try:
                raw = gl.nondet.exec_prompt(prompt, response_format="json")
            except Exception as e:
                raise gl.vm.UserError(f"{ERR_LLM} scoring_prompt_failed:{e}")

            if isinstance(raw, dict):
                parsed = raw
            else:
                try:
                    parsed = json.loads(raw)
                except Exception:
                    raise gl.vm.UserError(f"{ERR_LLM} scoring_not_json")

            cleaned = {login: _coerce_score(parsed.get(login, 0)) for login in logins}
            return json.dumps(cleaned, sort_keys=True)

        score_json = gl.eq_principle.prompt_non_comparative(
            score,
            task=(
                "Produce a JSON object mapping each contributor login to an "
                "integer score 0-100."
            ),
            criteria=(
                "Output must be valid JSON. Every input login must appear "
                "exactly once. Scores must be integers 0-100. Bots (is_bot "
                "true on ALL their commits) must score 0. Whitespace/format-only "
                "commits must score <=5. The leader's rubric application must "
                "be plausible."
            ),
        )
        try:
            scores = json.loads(score_json)
        except Exception:
            raise gl.vm.UserError(f"{ERR_LLM} final_scores_not_json")

        # Defensive: re-coerce in case the validator's accepted output had
        # values outside 0-100 or non-int.
        scores = {login: _coerce_score(scores.get(login, 0)) for login in logins}

        total = sum(scores.values())
        if total == 0:
            return "no_substantive_work"

        distributed = 0
        for login in logins:
            weight = scores.get(login, 0)
            if weight <= 0:
                continue
            wallet = roster.get(login)
            if not wallet:
                continue
            share = pool * weight // total
            if share == 0:
                continue
            prev = int(self.pending[wallet]) if wallet in self.pending else 0
            self.pending[wallet] = str(prev + share)
            distributed += share

        record["pool_wei"] = str(pool - distributed)
        record["total_distributed_wei"] = str(
            int(record["total_distributed_wei"]) + distributed
        )
        record["last_distribution_unix"] = now
        record["distribution_count"] = int(record["distribution_count"]) + 1
        self.repos[repo_slug] = json.dumps(record, sort_keys=True)

        # T11 — public scoring transparency
        key = f"{repo_slug}:{record['distribution_count']}"
        self.score_log[key] = json.dumps(
            {
                "ts": now,
                "since": since_iso,
                "until": until_iso,
                "scores": scores,
                "distributed_wei": str(distributed),
                "release_tag": release_tag,
            },
            sort_keys=True,
        )
        return f"distributed_{distributed}"

    # ---- CLAIM (pull pattern) -------------------------------------------
    @gl.public.write
    def claim(self) -> str:
        """Contributor pulls their accumulated payout."""
        wallet_addr = gl.message.sender_address
        wallet = _wallet_str(wallet_addr)
        if wallet not in self.pending:
            return "nothing_to_claim"
        amount = int(self.pending[wallet])
        if amount == 0:
            return "nothing_to_claim"
        # Effects before interactions: zero out pending before the transfer.
        self.pending[wallet] = "0"
        gl.get_contract_at(wallet_addr).emit_transfer(value=u256(amount))
        return f"claimed_{amount}"

    # ---- DORMANT REFUND (T8) --------------------------------------------
    @gl.public.write
    def sponsor_refund(self, deposit_id: u256) -> str:
        """Sponsor reclaims unspent funds after the repo has been dormant
        for `DORMANT_REFUND_SEC`. Refund credits to sender's pending balance;
        the sponsor then calls `claim()` to actually withdraw."""
        if deposit_id not in self.deposits:
            raise gl.vm.UserError(f"{ERR_EXPECTED} no_deposit")
        dep = json.loads(self.deposits[deposit_id])
        if dep.get("refunded"):
            raise gl.vm.UserError(f"{ERR_EXPECTED} already_refunded")
        sender = _wallet_str(gl.message.sender_address)
        if dep["sponsor"] != sender:
            raise gl.vm.UserError(f"{ERR_EXPECTED} not_sponsor")

        record = json.loads(self.repos[dep["repo"]])
        last = int(
            record["last_distribution_unix"] or record["period_start_unix"]
        )
        now = _now_unix()
        if now - last < DORMANT_REFUND_SEC:
            raise gl.vm.UserError(f"{ERR_EXPECTED} not_dormant")

        remaining_in_pool = int(record["pool_wei"])
        refund = min(int(dep["amount"]), remaining_in_pool)
        if refund <= 0:
            raise gl.vm.UserError(f"{ERR_EXPECTED} pool_drained")

        record["pool_wei"] = str(remaining_in_pool - refund)
        self.repos[dep["repo"]] = json.dumps(record, sort_keys=True)
        dep["refunded"] = True
        self.deposits[deposit_id] = json.dumps(dep, sort_keys=True)

        prev = int(self.pending[sender]) if sender in self.pending else 0
        self.pending[sender] = str(prev + refund)
        return f"refunded_{refund}"

    # ---- VIEWS ----------------------------------------------------------
    @gl.public.view
    def get_repo(self, repo_slug: str) -> str:
        return self.repos[repo_slug] if repo_slug in self.repos else ""

    @gl.public.view
    def get_roster(self, repo_slug: str) -> str:
        return self.enrolled[repo_slug] if repo_slug in self.enrolled else "{}"

    @gl.public.view
    def get_pending(self, wallet: str) -> str:
        key = wallet.lower()
        return self.pending[key] if key in self.pending else "0"

    @gl.public.view
    def get_score_log(self, repo_slug: str, distribution_index: int) -> str:
        k = f"{repo_slug}:{int(distribution_index)}"
        return self.score_log[k] if k in self.score_log else ""

    @gl.public.view
    def get_deposit(self, deposit_id: u256) -> str:
        return self.deposits[deposit_id] if deposit_id in self.deposits else ""

    @gl.public.view
    def next_deposit(self) -> u256:
        return self.next_deposit_id
