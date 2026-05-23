"""Direct-mode tests for the test-mode contract (gitdrip_testmode.py).

These prove that the only differences between the production contract and the
test-mode build are the two timing constants — and that with both set to
zero, the timing-locked paths (period_too_short, not_dormant) become open:

* `distribute()` no longer needs MIN_PERIOD_SEC to elapse before running again
* `sponsor_refund()` no longer needs DORMANT_REFUND_SEC of inactivity

Every other behaviour — register, enroll, sponsor, claim — is identical to
gitdrip.py and is already covered by tests/direct/test_gitdrip.py against the
production constants. We don't re-test those here.
"""
from __future__ import annotations

import json
from pathlib import Path

from conftest import (
    commit_detail,
    commit_summary,
    gist_payload,
    gitdrip_json,
    mock_eq_verdict,
    mock_web_json,
)


TESTMODE_PATH_REL = "contract/contracts/gitdrip_testmode.py"
TESTMODE_PATH_ABS = (
    Path(__file__).resolve().parent.parent.parent
    / "contracts"
    / "gitdrip_testmode.py"
)


def _wallet(addr) -> str:
    if isinstance(addr, (bytes, bytearray)):
        return "0x" + bytes(addr).hex()
    if hasattr(addr, "as_hex"):
        return addr.as_hex.lower()
    return str(addr).lower()


def _setup_register_mocks(vm, repo: str, wallet_lower: str) -> None:
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


def _setup_enroll_mocks(vm, login: str, gist_id: str, expected_body: str) -> None:
    mock_web_json(
        vm,
        rf"api\.github\.com/gists/{gist_id}",
        gist_payload(login, expected_body),
    )
    mock_eq_verdict(vm, "Decide if a public Gist proves", {"ok": True})


def _setup_scoring_mocks(vm, repo: str, login: str, score: int) -> None:
    mock_web_json(
        vm,
        rf"api\.github\.com/repos/{repo}/commits\?.*author={login}",
        [commit_summary("a" * 40, login, "feat: add cool thing")],
    )
    mock_web_json(
        vm,
        rf"api\.github\.com/repos/{repo}/commits/{'a' * 40}",
        commit_detail("a" * 40, additions=120, deletions=20, patch="+ real code\n"),
    )
    # Leader's exec_prompt
    vm.mock_llm(
        r"You score open-source contributors",
        json.dumps({login: score}),
    )
    mock_eq_verdict(
        vm,
        "Produce a JSON object mapping each contributor login",
        {login: score},
    )


def _register(contract, vm, sender, repo: str) -> str:
    wallet = _wallet(sender)
    _setup_register_mocks(vm, repo, wallet)
    vm.sender = sender
    contract.register_repo(repo, "")
    return wallet


def _enroll(contract, vm, sender, *, repo: str, login: str, gist_id: str) -> None:
    wallet = _wallet(sender)
    expected = f"gitdrip:{repo}:{wallet}"
    _setup_enroll_mocks(vm, login, gist_id, expected)
    vm.sender = sender
    contract.enroll_contributor(repo, login, gist_id)


# ---------------------------------------------------------------------------
# Constants surface — sanity check
# ---------------------------------------------------------------------------
def test_testmode_constants_are_zero():
    src = TESTMODE_PATH_ABS.read_text()
    assert "MIN_PERIOD_SEC = 0" in src
    assert "DORMANT_REFUND_SEC = 0" in src


# ---------------------------------------------------------------------------
# distribute() bypasses MIN_PERIOD_SEC
# ---------------------------------------------------------------------------
def test_distribute_runs_back_to_back(
    direct_deploy, direct_vm, direct_alice, direct_bob, direct_charlie
):
    """With MIN_PERIOD_SEC=0, distribute() can run immediately after sponsoring,
    and again right after. In production this would raise period_too_short."""
    direct_vm.warp("2026-05-22T20:00:00+00:00")

    repo = "alnamodevloper/gitdrip-demo"
    contract = direct_deploy(TESTMODE_PATH_REL)

    _register(contract, direct_vm, direct_alice, repo)
    _enroll(
        contract,
        direct_vm,
        direct_charlie,
        repo=repo,
        login="alnamodevloper",
        gist_id="abc123",
    )

    # First sponsor + distribute
    direct_vm.sender = direct_bob
    direct_vm.value = 10 * 10**18  # 10 GEN
    contract.sponsor(repo)

    _setup_scoring_mocks(direct_vm, repo, "alnamodevloper", 80)

    direct_vm.sender = direct_alice
    direct_vm.value = 0
    out1 = contract.distribute(repo)
    assert out1.startswith("distributed_"), f"first distribute failed: {out1}"

    # Sponsor again, then distribute again — production would raise
    # period_too_short. In test-mode it must succeed.
    direct_vm.sender = direct_bob
    direct_vm.value = 10 * 10**18
    contract.sponsor(repo)

    direct_vm.sender = direct_alice
    direct_vm.value = 0
    out2 = contract.distribute(repo)
    assert out2.startswith("distributed_"), (
        f"second back-to-back distribute should succeed in test-mode but got: {out2}"
    )

    rec = json.loads(contract.get_repo(repo))
    assert rec["distribution_count"] == 2


# ---------------------------------------------------------------------------
# sponsor_refund() bypasses DORMANT_REFUND_SEC
# ---------------------------------------------------------------------------
def test_sponsor_refund_immediately(
    direct_deploy, direct_vm, direct_alice, direct_bob
):
    """With DORMANT_REFUND_SEC=0, a sponsor can refund the same block they
    sponsored. In production this would raise not_dormant."""
    direct_vm.warp("2026-05-22T20:00:00+00:00")

    repo = "alnamodevloper/gitdrip-demo"
    contract = direct_deploy(TESTMODE_PATH_REL)

    _register(contract, direct_vm, direct_alice, repo)

    direct_vm.sender = direct_bob
    direct_vm.value = 20 * 10**18
    deposit_id = contract.sponsor(repo)
    assert int(deposit_id) == 0

    # Refund the same deposit immediately — production would raise not_dormant.
    direct_vm.sender = direct_bob
    direct_vm.value = 0
    out = contract.sponsor_refund(0)
    assert out == f"refunded_{20 * 10**18}", f"expected refund, got {out}"

    rec = json.loads(contract.get_repo(repo))
    assert rec["pool_wei"] == "0"

    pending = contract.get_pending(_wallet(direct_bob))
    assert pending == str(20 * 10**18)


# ---------------------------------------------------------------------------
# Refund + claim full cycle in one block
# ---------------------------------------------------------------------------
def test_refund_then_claim(direct_deploy, direct_vm, direct_alice, direct_bob):
    """Sponsor immediately refunds, then claims — full cycle in test-mode."""
    direct_vm.warp("2026-05-22T20:00:00+00:00")

    repo = "alnamodevloper/gitdrip-demo"
    contract = direct_deploy(TESTMODE_PATH_REL)

    _register(contract, direct_vm, direct_alice, repo)

    direct_vm.sender = direct_bob
    direct_vm.value = 30 * 10**18
    contract.sponsor(repo)

    direct_vm.sender = direct_bob
    direct_vm.value = 0
    contract.sponsor_refund(0)

    # claim() takes no args; it uses sender's address. Direct mode doesn't
    # actually move funds but the call should succeed and clear pending.
    direct_vm.sender = direct_bob
    direct_vm.value = 0
    out = contract.claim()
    assert out.startswith(f"claimed_{30 * 10**18}"), out

    pending = contract.get_pending(_wallet(direct_bob))
    assert pending == "0"
