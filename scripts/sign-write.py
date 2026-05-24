"""Submit a contract write to Bradbury via genlayer-py.

Usage:
    python scripts/sign-write.py [--contract 0x...] [--key KEY_N] <method> <args-json> [value-in-gen]

Defaults:
    contract = production GitDrip contract
    key      = ACCOUNT_PRIVATE_KEY_1

Reads the project .env (already loaded by .envrc).  Never prints the key.
"""
import argparse
import json
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from genlayer_py import create_client
from genlayer_py.chains import testnet_bradbury
from eth_account import Account


DEFAULT_CONTRACT = "0x4f079033484B806e42385E53bE20209B89049Bee"


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--contract", default=DEFAULT_CONTRACT)
    p.add_argument("--key", default="ACCOUNT_PRIVATE_KEY_1")
    p.add_argument("method")
    p.add_argument("args_json")
    p.add_argument("value_gen", nargs="?", default="0")
    args = p.parse_args()

    args_list = json.loads(args.args_json)
    value_gen = float(args.value_gen)
    value_wei = int(value_gen * 1e18)

    pk = os.environ.get(args.key)
    if not pk:
        print(f"{args.key} missing in .env")
        return 1
    if not pk.startswith("0x"):
        pk = "0x" + pk
    account = Account.from_key(pk)

    client = create_client(chain=testnet_bradbury, account=account)

    print(f"contract: {args.contract}")
    print(f"from:     {account.address}")
    print(f"method:   {args.method}")
    print(f"args:     {args_list}")
    print(f"value:    {value_gen} GEN ({value_wei} wei)")
    print()

    # NOTE: write_contract returns the tx hash; we wait separately.
    try:
        tx_hash = client.write_contract(
            address=args.contract,
            function_name=args.method,
            account=account,
            value=value_wei,
            args=args_list,
        )
        print(f"tx_hash: {tx_hash}")
        print("waiting for receipt (up to ~5 min)...")
        receipt = client.wait_for_transaction_receipt(
            transaction_hash=tx_hash,
            status="ACCEPTED",
            interval=10,
            retries=30,
        )
        print("=== receipt ===")
    except Exception as e:
        msg = str(e)
        # Extract any tx hash from the error message
        import re
        m = re.search(r"0x[0-9a-fA-F]{64}", msg)
        if m:
            tx_hash = m.group(0)
            print(f"write_contract error, tx_hash={tx_hash}")
            print(f"detail: {msg.splitlines()[0][:200]}")
            print("polling tx for status...")
            for i in range(40):
                try:
                    rx = client.get_transaction(transaction_hash=tx_hash)
                    sn = rx.get("status_name") or rx.get("statusName")
                    rn = rx.get("result_name") or rx.get("resultName")
                    en = rx.get("tx_execution_result_name") or rx.get("txExecutionResultName")
                    print(f"  [{i*10}s] status={sn} result={rn} exec={en}")
                    if sn in ("ACCEPTED", "FINALIZED"):
                        receipt = rx
                        break
                    if sn in ("CANCELED", "UNDETERMINED") or rn == "TIMEOUT":
                        return 2
                except Exception as e2:
                    print(f"  [{i*10}s] poll err: {e2}")
                time.sleep(10)
            else:
                return 2
        else:
            print(f"unrecoverable error: {msg[:300]}")
            return 1

    sn = receipt.get("status_name") or receipt.get("statusName")
    rn = receipt.get("result_name") or receipt.get("resultName")
    en = receipt.get("tx_execution_result_name") or receipt.get("txExecutionResultName")
    print(f"status_name: {sn}")
    print(f"result_name: {rn}")
    print(f"exec_name: {en}")
    last = receipt.get("last_round") or receipt.get("lastRound") or {}
    votes = last.get("validator_votes_name") or last.get("validatorVotesName") or []
    if votes:
        print(f"validator votes: {votes}")
    if en == "FINISHED_WITH_ERROR":
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main())
