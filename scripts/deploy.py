"""Deploy a GitDrip contract to Bradbury via genlayer-py.

Reads ACCOUNT_PRIVATE_KEY_1 from .env. Never prints the key.

Usage:
    python scripts/deploy.py [--contract contract/contracts/gitdrip.py]
"""
import argparse
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from genlayer_py import create_client
from genlayer_py.chains import testnet_bradbury
from eth_account import Account


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--contract", default="contract/contracts/gitdrip.py")
    p.add_argument("--key", default="ACCOUNT_PRIVATE_KEY_1")
    args = p.parse_args()

    pk = os.environ.get(args.key)
    if not pk:
        print(f"{args.key} missing in .env")
        return 1
    if not pk.startswith("0x"):
        pk = "0x" + pk
    account = Account.from_key(pk)

    contract_path = Path(args.contract).resolve()
    if not contract_path.exists():
        print(f"contract not found: {contract_path}")
        return 1
    code = contract_path.read_text()

    client = create_client(chain=testnet_bradbury, account=account)

    print(f"contract source: {contract_path}")
    print(f"deployer:        {account.address}")
    print(f"chain:           Bradbury (4221)")
    print(f"size:            {len(code.encode())} bytes")
    print()

    print("submitting deploy...")
    try:
        tx_hash = client.deploy_contract(
            code=code,
            account=account,
            args=[],
        )
    except Exception as e:
        print(f"deploy error: {str(e)[:300]}")
        return 1

    print(f"tx_hash: {tx_hash}")
    print("waiting for receipt (up to ~5 min)...")
    receipt = None
    try:
        receipt = client.wait_for_transaction_receipt(
            transaction_hash=tx_hash,
            status="ACCEPTED",
            interval=10,
            retries=30,
        )
    except Exception as e:
        # Fall back to polling for the tx status
        print(f"wait error: {str(e)[:200]}")
        for i in range(40):
            try:
                rx = client.get_transaction(transaction_hash=tx_hash)
                sn = rx.get("status_name") or rx.get("statusName")
                rn = rx.get("result_name") or rx.get("resultName")
                print(f"  [{i*10}s] status={sn} result={rn}")
                if sn in ("ACCEPTED", "FINALIZED"):
                    receipt = rx
                    break
                if sn in ("CANCELED", "UNDETERMINED") or rn == "TIMEOUT":
                    return 2
            except Exception as e2:
                print(f"  [{i*10}s] poll err: {e2}")
            time.sleep(10)

    if not receipt:
        print("timed out waiting for receipt")
        return 2

    print("=== receipt ===")
    sn = receipt.get("status_name") or receipt.get("statusName")
    rn = receipt.get("result_name") or receipt.get("resultName")
    en = receipt.get("tx_execution_result_name") or receipt.get("txExecutionResultName")
    print(f"status_name: {sn}")
    print(f"result_name: {rn}")
    print(f"exec_name:   {en}")

    contract_addr = (
        receipt.get("data", {}).get("contract_address")
        or receipt.get("contract_address")
        or receipt.get("contractAddress")
        or receipt.get("to_address")
        or receipt.get("toAddress")
    )
    print()
    print("=" * 60)
    print(f"CONTRACT ADDRESS: {contract_addr}")
    print(f"DEPLOY TX:        {tx_hash}")
    print("=" * 60)

    if en == "FINISHED_WITH_ERROR":
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main())
