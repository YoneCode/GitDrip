"""Submit a contract write to Bradbury with optional native value via genlayer-py.

Usage:
    python scripts/sign-write.py <method> <args-json> [value-in-gen]

Reads ACCOUNT_PRIVATE_KEY_1 from the project .env (already loaded by .envrc).
Never prints the private key.
"""
import json
import os
import sys
from pathlib import Path

# Ensure project .env is loaded
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from genlayer_py import create_client
from genlayer_py.chains import testnet_bradbury
from eth_account import Account

CONTRACT = "0x725A57f7ED354eD124812DB9349483095dd38d99"


def main() -> int:
    if len(sys.argv) < 3:
        print("usage: sign-write.py <method> <args-json> [value-in-gen]")
        return 1
    method = sys.argv[1]
    args = json.loads(sys.argv[2])
    value_gen = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0
    value_wei = int(value_gen * 1e18)

    pk = os.environ.get("ACCOUNT_PRIVATE_KEY_1")
    if not pk:
        print("ACCOUNT_PRIVATE_KEY_1 missing")
        return 1
    if not pk.startswith("0x"):
        pk = "0x" + pk
    account = Account.from_key(pk)

    client = create_client(chain=testnet_bradbury, account=account)

    print(f"from: {account.address}")
    print(f"method: {method}")
    print(f"args: {args}")
    print(f"value: {value_gen} GEN ({value_wei} wei)")

    tx_hash = client.write_contract(
        address=CONTRACT,
        function_name=method,
        account=account,
        value=value_wei,
        args=args,
    )
    print(f"tx hash: {tx_hash}")

    print("waiting for receipt...")
    receipt = client.wait_for_transaction_receipt(
        transaction_hash=tx_hash,
        status="ACCEPTED",
        interval=5,
        retries=24,
    )
    print(f"status_name: {receipt.get('status_name')}")
    print(f"resultName: {receipt.get('resultName')}")
    print(f"txExecutionResultName: {receipt.get('txExecutionResultName')}")
    cd = receipt.get("consensus_data") or {}
    lr = (cd.get("leader_receipt") or [None])[0] or {}
    if lr:
        print(f"leader vote: {lr.get('vote_type')}, exec: {lr.get('execution_result')}")
        if lr.get("error"):
            print(f"error: {lr.get('error')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
