"""Direct-mode tests for the GitDrip contract.

Each test:
1. Deploys gitdrip.py in-process via ``direct_deploy``.
2. Installs web mocks for the GitHub endpoints the leader fetches.
3. Lets the eq_principle hook (see conftest) short-circuit the LLM judging
   step. Unless overridden, the hook returns the inner ``fn``'s output, which
   is exactly what the contract expects to parse.
4. Drives the contract via the test fixtures and asserts state.

These tests exercise contract logic, validation, and storage — they do NOT
exercise validator-side consensus. That's covered by the integration-tests
skill once a real Bradbury wallet is funded.
"""
from __future__ import annotations

import json

import pytest

from conftest import (
    commit_detail,
    commit_summary,
    gist_payload,
    gitdrip_json,
    mock_eq_verdict,
    mock_web_404,
    mock_web_json,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _wallet(addr) -> str:
    if isinstance(addr, (bytes, bytearray)):
        return "0x" + bytes(addr).hex()
    if hasattr(addr, "as_hex"):
        return addr.as_hex.lower()
    return str(addr).lower()


def _setup_register_mocks(vm, repo: str, wallet_lower: str) -> None:
    """Make register_repo's ownership proof succeed for `wallet_lower`."""
    mock_web_json(
        vm,
        rf"raw\.githubusercontent\.com/{repo}/HEAD/\.gitdrip\.json",
        gitdrip_json(wallet_lower),
    )
    mock_eq_verdict(
        vm,
        "Decide if the repository's .gitdrip.json file declares",
        {"ok": True},
    )


def _setup_enroll_mocks(
    vm, login: str, gist_id: str, expected_body: str
) -> None:
    """Make enroll_contributor succeed for `login` claiming `expected_body`."""
    mock_web_json(
        vm,
        rf"api\.github\.com/gists/{gist_id}",
        gist_payload(login, expected_body),
    )
    mock_eq_verdict(
        vm,
        "Decide if a public Gist proves",
        {"ok": True},
    )


def _register(contract, vm, sender, repo: str = "alice/cool-cli") -> str:
    """Register `repo` with `sender` as maintainer; returns the wallet str."""
    wallet = _wallet(sender)
    _setup_register_mocks(vm, repo, wallet)
    vm.sender = sender
    contract.register_repo(repo, "")
    return wallet


def _enroll(
    contract,
    vm,
    sender,
    *,
    repo: str = "alice/cool-cli",
    login: str,
    gist_id: str = "gistA",
) -> None:
    wallet = _wallet(sender)
    expected_body = f"gitdrip:{repo}:{wallet}"
    _setup_enroll_mocks(vm, login, gist_id, expected_body)
    vm.sender = sender
    contract.enroll_contributor(repo, login, gist_id)


# ---------------------------------------------------------------------------
# REGISTER
# ---------------------------------------------------------------------------
class TestRegisterRepo:
    def test_happy_path(self, direct_vm, direct_deploy, direct_alice):
        contract = direct_deploy("contract/contracts/gitdrip.py")
        wallet = _register(contract, direct_vm, direct_alice)
        record = json.loads(contract.get_repo("alice/cool-cli"))
        assert record["maintainer"] == wallet
        assert record["pool_wei"] == "0"
        assert record["distribution_count"] == 0
        # roster initialised but empty
        assert json.loads(contract.get_roster("alice/cool-cli")) == {}

    def test_duplicate_register_rejected(
        self, direct_vm, direct_deploy, direct_alice
    ):
        contract = direct_deploy("contract/contracts/gitdrip.py")
        _register(contract, direct_vm, direct_alice)
        # second register with the same slug must fail with EXPECTED prefix
        with direct_vm.expect_revert("[EXPECTED] already_registered"):
            contract.register_repo("alice/cool-cli", "")

    def test_ownership_mismatch_rejected(
        self, direct_vm, direct_deploy, direct_alice, direct_bob
    ):
        contract = direct_deploy("contract/contracts/gitdrip.py")
        # .gitdrip.json declares Alice but Bob calls register_repo.
        repo = "alice/cool-cli"
        mock_web_json(
            direct_vm,
            rf"raw\.githubusercontent\.com/{repo}/HEAD/\.gitdrip\.json",
            gitdrip_json(_wallet(direct_alice)),
        )
        # Eq hook returns the leader's payload by default; that payload has
        # ok=false because wallet != claimed_by, so the contract rejects.
        direct_vm.sender = direct_bob
        with direct_vm.expect_revert("[EXPECTED] ownership_proof_failed"):
            contract.register_repo(repo, "")

    def test_missing_proof_file_rejected(
        self, direct_vm, direct_deploy, direct_alice
    ):
        contract = direct_deploy("contract/contracts/gitdrip.py")
        repo = "alice/cool-cli"
        mock_web_404(
            direct_vm,
            rf"raw\.githubusercontent\.com/{repo}/HEAD/\.gitdrip\.json",
        )
        direct_vm.sender = direct_alice
        with direct_vm.expect_revert("[EXPECTED] ownership_proof_failed"):
            contract.register_repo(repo, "")


# ---------------------------------------------------------------------------
# ENROLL
# ---------------------------------------------------------------------------
class TestEnrollContributor:
    def test_happy_path(self, direct_vm, direct_deploy, direct_alice, direct_bob):
        contract = direct_deploy("contract/contracts/gitdrip.py")
        _register(contract, direct_vm, direct_alice)
        _enroll(contract, direct_vm, direct_bob, login="bob")
        roster = json.loads(contract.get_roster("alice/cool-cli"))
        assert roster == {"bob": _wallet(direct_bob)}

    def test_no_repo_rejected(self, direct_vm, direct_deploy, direct_bob):
        contract = direct_deploy("contract/contracts/gitdrip.py")
        direct_vm.sender = direct_bob
        with direct_vm.expect_revert("[EXPECTED] no_repo"):
            contract.enroll_contributor("ghost/repo", "bob", "gistA")

    def test_wrong_login_rejected(
        self, direct_vm, direct_deploy, direct_alice, direct_bob
    ):
        contract = direct_deploy("contract/contracts/gitdrip.py")
        _register(contract, direct_vm, direct_alice)
        # Gist owned by 'mallory' but Bob claims login 'bob'.
        repo = "alice/cool-cli"
        wallet = _wallet(direct_bob)
        mock_web_json(
            direct_vm,
            r"api\.github\.com/gists/gistA",
            gist_payload("mallory", f"gitdrip:{repo}:{wallet}"),
        )
        direct_vm.sender = direct_bob
        with direct_vm.expect_revert("[EXPECTED] opt_in_proof_failed"):
            contract.enroll_contributor(repo, "bob", "gistA")


# ---------------------------------------------------------------------------
# SPONSOR
# ---------------------------------------------------------------------------
class TestSponsor:
    def test_increments_pool_and_records_deposit(
        self, direct_vm, direct_deploy, direct_alice, direct_charlie
    ):
        contract = direct_deploy("contract/contracts/gitdrip.py")
        _register(contract, direct_vm, direct_alice)
        # Charlie sponsors 10 GEN (= MIN_SPONSOR_WEI)
        direct_vm.sender = direct_charlie
        direct_vm.value = 10 * 10**18
        deposit_id = contract.sponsor("alice/cool-cli")
        assert int(deposit_id) == 0
        record = json.loads(contract.get_repo("alice/cool-cli"))
        assert record["pool_wei"] == str(10 * 10**18)
        dep = json.loads(contract.get_deposit(0))
        assert dep == {
            "amount": str(10 * 10**18),
            "refunded": False,
            "repo": "alice/cool-cli",
            "sponsor": _wallet(direct_charlie),
            "ts": dep["ts"],
        }

    def test_below_min_rejected(
        self, direct_vm, direct_deploy, direct_alice, direct_charlie
    ):
        contract = direct_deploy("contract/contracts/gitdrip.py")
        _register(contract, direct_vm, direct_alice)
        direct_vm.sender = direct_charlie
        direct_vm.value = 0
        with direct_vm.expect_revert("[EXPECTED] below_min"):
            contract.sponsor("alice/cool-cli")

    def test_no_repo_rejected(
        self, direct_vm, direct_deploy, direct_charlie
    ):
        contract = direct_deploy("contract/contracts/gitdrip.py")
        direct_vm.sender = direct_charlie
        direct_vm.value = 10 * 10**18
        with direct_vm.expect_revert("[EXPECTED] no_repo"):
            contract.sponsor("ghost/repo")


# ---------------------------------------------------------------------------
# DISTRIBUTE
# ---------------------------------------------------------------------------
def _setup_scoring_mocks(
    vm,
    repo: str,
    *,
    bob_login: str = "bob",
    bob_score: int = 60,
    carol_login: str = "carol",
    carol_score: int = 30,
) -> None:
    """Mock the GitHub commits/diff endpoints + the LLM scoring verdict."""
    # /commits?author=bob => one substantive commit
    mock_web_json(
        vm,
        rf"api\.github\.com/repos/{repo}/commits\?.*author={bob_login}",
        [commit_summary("a" * 40, bob_login, "feat: new auth flow")],
    )
    mock_web_json(
        vm,
        rf"api\.github\.com/repos/{repo}/commits/{('a' * 40)}",
        commit_detail("a" * 40, additions=120, deletions=20, patch="+ real code\n"),
    )
    # /commits?author=carol => one tiny doc commit
    mock_web_json(
        vm,
        rf"api\.github\.com/repos/{repo}/commits\?.*author={carol_login}",
        [commit_summary("b" * 40, carol_login, "docs: fix typo")],
    )
    mock_web_json(
        vm,
        rf"api\.github\.com/repos/{repo}/commits/{('b' * 40)}",
        commit_detail("b" * 40, additions=2, deletions=1, patch="-typo\n+typo\n"),
    )
    # The contract's leader fn calls gl.nondet.exec_prompt which we mock
    # directly (the eq_principle hook just passes the leader's output through).
    vm.mock_llm(
        r"You score open-source contributors",
        json.dumps({bob_login: bob_score, carol_login: carol_score}),
    )
    mock_eq_verdict(
        vm,
        "Produce a JSON object mapping each contributor login",
        # Leader's output is passed through → just need this to be valid JSON
        # mapping logins to scores.
        {bob_login: bob_score, carol_login: carol_score},
    )


class TestDistribute:
    def test_full_cycle_credits_pending(
        self,
        direct_vm,
        direct_deploy,
        direct_alice,
        direct_bob,
        direct_charlie,
    ):
        contract = direct_deploy("contract/contracts/gitdrip.py")
        # Maintainer = Alice, contributors = Bob (login bob), Carol (using
        # direct_charlie wallet under login 'carol' for variety).
        _register(contract, direct_vm, direct_alice)
        _enroll(contract, direct_vm, direct_bob, login="bob", gist_id="g1")
        _enroll(
            contract, direct_vm, direct_charlie, login="carol", gist_id="g2"
        )

        # Sponsor 90 GEN
        direct_vm.sender = direct_alice  # any caller
        direct_vm.value = 90 * 10**18
        contract.sponsor("alice/cool-cli")

        # Move clock forward past MIN_PERIOD_SEC (7d).
        direct_vm.warp("2027-01-01T00:00:00Z")
        _setup_scoring_mocks(
            direct_vm, "alice/cool-cli", bob_score=60, carol_score=30
        )

        direct_vm.value = 0
        result = contract.distribute("alice/cool-cli")
        # scores 60 + 30 = 90 → bob = 90 GEN * 60/90 = 60 GEN, carol = 30 GEN.
        assert result == f"distributed_{90 * 10**18}"

        record = json.loads(contract.get_repo("alice/cool-cli"))
        assert record["pool_wei"] == "0"
        assert record["distribution_count"] == 1
        assert record["total_distributed_wei"] == str(90 * 10**18)

        assert contract.get_pending(_wallet(direct_bob)) == str(60 * 10**18)
        assert contract.get_pending(_wallet(direct_charlie)) == str(30 * 10**18)

        snapshot = json.loads(contract.get_score_log("alice/cool-cli", 1))
        assert snapshot["scores"] == {"bob": 60, "carol": 30}
        assert snapshot["distributed_wei"] == str(90 * 10**18)

    def test_period_too_short_rejected(
        self, direct_vm, direct_deploy, direct_alice, direct_bob
    ):
        contract = direct_deploy("contract/contracts/gitdrip.py")
        _register(contract, direct_vm, direct_alice)
        _enroll(contract, direct_vm, direct_bob, login="bob")
        direct_vm.value = 10 * 10**18
        contract.sponsor("alice/cool-cli")

        direct_vm.value = 0
        # Don't advance time — same block as register_repo.
        with direct_vm.expect_revert("[EXPECTED] period_too_short"):
            contract.distribute("alice/cool-cli")

    def test_empty_pool_returns_string(
        self, direct_vm, direct_deploy, direct_alice
    ):
        contract = direct_deploy("contract/contracts/gitdrip.py")
        _register(contract, direct_vm, direct_alice)
        direct_vm.warp("2027-01-01T00:00:00Z")
        result = contract.distribute("alice/cool-cli")
        assert result == "empty_pool"

    def test_no_substantive_work_returns_string(
        self, direct_vm, direct_deploy, direct_alice, direct_bob
    ):
        contract = direct_deploy("contract/contracts/gitdrip.py")
        _register(contract, direct_vm, direct_alice)
        _enroll(contract, direct_vm, direct_bob, login="bob")
        direct_vm.value = 50 * 10**18
        contract.sponsor("alice/cool-cli")

        direct_vm.warp("2027-01-01T00:00:00Z")
        # All commits are bot commits → score 0
        mock_web_json(
            direct_vm,
            r"api\.github\.com/repos/alice/cool-cli/commits\?.*author=bob",
            [commit_summary("c" * 40, "bob", "chore: bump", is_bot=True)],
        )
        mock_web_json(
            direct_vm,
            r"api\.github\.com/repos/alice/cool-cli/commits/" + "c" * 40,
            commit_detail("c" * 40, additions=2, deletions=2),
        )
        direct_vm.mock_llm(
            r"You score open-source contributors",
            json.dumps({"bob": 0}),
        )
        mock_eq_verdict(
            direct_vm,
            "Produce a JSON object mapping each contributor login",
            {"bob": 0},
        )

        direct_vm.value = 0
        result = contract.distribute("alice/cool-cli")
        assert result == "no_substantive_work"
        # pool stays put
        assert json.loads(contract.get_repo("alice/cool-cli"))["pool_wei"] == str(50 * 10**18)

    def test_release_distribution_bypasses_period(
        self, direct_vm, direct_deploy, direct_alice, direct_bob
    ):
        contract = direct_deploy("contract/contracts/gitdrip.py")
        _register(contract, direct_vm, direct_alice)
        _enroll(contract, direct_vm, direct_bob, login="bob")
        direct_vm.value = 10 * 10**18
        contract.sponsor("alice/cool-cli")

        # Same block — period would normally reject; release path skips check.
        mock_web_json(
            direct_vm,
            r"api\.github\.com/repos/alice/cool-cli/commits\?.*author=bob",
            [commit_summary("d" * 40, "bob", "feat: ship v1")],
        )
        mock_web_json(
            direct_vm,
            r"api\.github\.com/repos/alice/cool-cli/commits/" + "d" * 40,
            commit_detail("d" * 40, additions=200, deletions=10),
        )
        direct_vm.mock_llm(
            r"You score open-source contributors",
            json.dumps({"bob": 80}),
        )
        mock_eq_verdict(
            direct_vm,
            "Produce a JSON object mapping each contributor login",
            {"bob": 80},
        )

        direct_vm.value = 0
        result = contract.distribute_on_release("alice/cool-cli", "v1.0")
        assert result == f"distributed_{10 * 10**18}"
        assert contract.get_pending(_wallet(direct_bob)) == str(10 * 10**18)
        # Same tag rejected
        with direct_vm.expect_revert("[EXPECTED] release_already_distributed"):
            contract.distribute_on_release("alice/cool-cli", "v1.0")


# ---------------------------------------------------------------------------
# CLAIM
# ---------------------------------------------------------------------------
class TestClaim:
    def test_nothing_to_claim(self, direct_vm, direct_deploy, direct_bob):
        contract = direct_deploy("contract/contracts/gitdrip.py")
        direct_vm.sender = direct_bob
        assert contract.claim() == "nothing_to_claim"

    def test_pending_zero_short_circuits(
        self,
        direct_vm,
        direct_deploy,
        direct_alice,
        direct_bob,
        direct_charlie,
    ):
        # Build a real pending balance via distribute, claim it, then check
        # the second claim returns nothing_to_claim (pending now zero).
        contract = direct_deploy("contract/contracts/gitdrip.py")
        _register(contract, direct_vm, direct_alice)
        _enroll(contract, direct_vm, direct_bob, login="bob")
        direct_vm.value = 10 * 10**18
        contract.sponsor("alice/cool-cli")
        direct_vm.warp("2027-01-01T00:00:00Z")
        mock_web_json(
            direct_vm,
            r"api\.github\.com/repos/alice/cool-cli/commits\?.*author=bob",
            [commit_summary("e" * 40, "bob", "feat: thing")],
        )
        mock_web_json(
            direct_vm,
            r"api\.github\.com/repos/alice/cool-cli/commits/" + "e" * 40,
            commit_detail("e" * 40, additions=50, deletions=2),
        )
        direct_vm.mock_llm(
            r"You score open-source contributors",
            json.dumps({"bob": 50}),
        )
        mock_eq_verdict(
            direct_vm,
            "Produce a JSON object mapping each contributor login",
            {"bob": 50},
        )
        direct_vm.value = 0
        contract.distribute("alice/cool-cli")

        direct_vm.sender = direct_bob
        assert contract.claim() == f"claimed_{10 * 10**18}"
        # second claim — nothing left
        assert contract.claim() == "nothing_to_claim"
        assert contract.get_pending(_wallet(direct_bob)) == "0"


# ---------------------------------------------------------------------------
# REFUND
# ---------------------------------------------------------------------------
class TestSponsorRefund:
    def test_refund_after_dormancy(
        self,
        direct_vm,
        direct_deploy,
        direct_alice,
        direct_charlie,
    ):
        contract = direct_deploy("contract/contracts/gitdrip.py")
        _register(contract, direct_vm, direct_alice)
        direct_vm.sender = direct_charlie
        direct_vm.value = 50 * 10**18
        deposit_id = contract.sponsor("alice/cool-cli")

        # Jump well past the 180-day dormant window.
        direct_vm.warp("2030-01-01T00:00:00Z")
        direct_vm.value = 0
        result = contract.sponsor_refund(deposit_id)
        assert result == f"refunded_{50 * 10**18}"
        # Sponsor's pending balance now holds the refund — they call claim().
        assert contract.get_pending(_wallet(direct_charlie)) == str(50 * 10**18)
        dep = json.loads(contract.get_deposit(deposit_id))
        assert dep["refunded"] is True

    def test_refund_too_early(
        self,
        direct_vm,
        direct_deploy,
        direct_alice,
        direct_charlie,
    ):
        contract = direct_deploy("contract/contracts/gitdrip.py")
        _register(contract, direct_vm, direct_alice)
        direct_vm.sender = direct_charlie
        direct_vm.value = 50 * 10**18
        deposit_id = contract.sponsor("alice/cool-cli")

        direct_vm.value = 0
        with direct_vm.expect_revert("[EXPECTED] not_dormant"):
            contract.sponsor_refund(deposit_id)

    def test_only_sponsor_can_refund(
        self,
        direct_vm,
        direct_deploy,
        direct_alice,
        direct_bob,
        direct_charlie,
    ):
        contract = direct_deploy("contract/contracts/gitdrip.py")
        _register(contract, direct_vm, direct_alice)
        direct_vm.sender = direct_charlie
        direct_vm.value = 50 * 10**18
        deposit_id = contract.sponsor("alice/cool-cli")

        direct_vm.warp("2030-01-01T00:00:00Z")
        direct_vm.value = 0
        # Bob (not sponsor) tries to refund Charlie's deposit.
        direct_vm.sender = direct_bob
        with direct_vm.expect_revert("[EXPECTED] not_sponsor"):
            contract.sponsor_refund(deposit_id)
