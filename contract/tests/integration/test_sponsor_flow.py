"""Integration tests for GitDrip contract on Bradbury testnet.

Run with:
    set -a && source .env && set +a
    pytest contract/tests/integration/ -v -s --network testnet_bradbury

These tests deploy a fresh GitDrip instance to Bradbury and exercise view
calls plus a write that is expected to fail (sponsor on unregistered repo).
They do NOT require a real GitHub repo with .gitdrip.json.
"""
from gltest import get_contract_factory, get_default_account
from gltest.assertions import tx_execution_succeeded, tx_execution_failed


def test_initial_state_is_empty():
    """A fresh contract has zero deposits and empty repos."""
    factory = get_contract_factory(contract_name="GitDrip")
    contract = factory.deploy(args=[])

    # next_deposit starts at 0
    result = contract.next_deposit(args=[]).call()
    assert result == 0 or result == "0", f"expected 0, got {result!r}"

    # get_repo for any slug returns empty string
    assert contract.get_repo(args=["test/fake-repo"]).call() == ""

    # get_roster returns empty JSON object
    roster = contract.get_roster(args=["test/fake-repo"]).call()
    assert roster in ("{}", "")


def test_sponsor_on_unregistered_repo_fails():
    """Sponsoring a repo that hasn't been registered must revert."""
    factory = get_contract_factory(contract_name="GitDrip")
    contract = factory.deploy(args=[])

    tx = contract.sponsor(args=["test/fake-repo"]).transact(
        value=100000000000000000  # 0.1 GEN
    )
    assert tx_execution_failed(tx), (
        f"expected sponsor to fail on unregistered repo, but tx succeeded"
    )


def test_pending_balance_starts_at_zero():
    """Any address should have zero pending before any distribution."""
    factory = get_contract_factory(contract_name="GitDrip")
    contract = factory.deploy(args=[])
    account = get_default_account()

    result = contract.get_pending(args=[account.address]).call()
    assert result == "0", f"expected '0', got {result!r}"
