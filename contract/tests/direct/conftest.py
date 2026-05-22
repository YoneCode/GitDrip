"""
Shared fixtures and helpers for direct-mode GitDrip tests.

Direct-mode pytest plugin (`gltest.direct`) lets us deploy the contract
in-process and inject web/LLM responses. The released wasi mock handles
``WebRequest`` and ``ExecPrompt`` but does NOT handle ``ExecPromptTemplate``,
which the SDK's ``gl.eq_principle.prompt_non_comparative`` uses internally.

We install a ``_gl_call_hook`` on each VM that recognises ``ExecPromptTemplate``
and returns mocked verdicts. Tests register them with ``mock_eq_verdict``.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Pattern

import pytest


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent / "contracts" / "gitdrip.py"
)


# ---------------------------------------------------------------------------
# Equivalence-principle (ExecPromptTemplate) hook
# ---------------------------------------------------------------------------
def _install_eq_principle_hook(vm) -> None:
    """Install a gl_call hook on ``vm`` that intercepts ``ExecPromptTemplate``.

    GitDrip uses ``gl.eq_principle.prompt_non_comparative(fn, task=, criteria=)``.
    Internally that wraps fn into a leader function that fetches data, then asks
    an LLM to judge it via the ``EqNonComparativeLeader`` template. In direct
    mode we want to short-circuit the judging step:

    - Leader template -> return a mocked verdict (matched against ``task``)
    - Validator template -> assume it agrees (we don't exercise consensus here)
    """
    eq_mocks: list[tuple[Pattern, Any]] = []

    def hook(_vm, request):
        if not isinstance(request, dict):
            return None
        if "ExecPromptTemplate" not in request:
            return None
        data = request["ExecPromptTemplate"]
        template = data.get("template", "")
        task = data.get("task", "")
        if template == "EqNonComparativeLeader":
            for pattern, verdict in eq_mocks:
                if pattern.search(task):
                    return {"ok": verdict}
            # By default, just echo the leader's input back. The contract
            # parses the verdict as JSON, so passing input through is the
            # most useful default — tests can override per-case.
            return {"ok": data.get("input", "")}
        if template == "EqNonComparativeValidator":
            # Validator template returns a bool. We always agree.
            return {"ok": True}
        if template == "EqComparative":
            # Not used in this contract, but mock just in case.
            return {"ok": True}
        return None

    vm._gl_call_hook = hook
    vm._eq_mocks = eq_mocks


def _verdict_to_string(verdict) -> str:
    """The contract `json.loads`-es the verdict, so accept dict-or-str inputs."""
    if isinstance(verdict, str):
        return verdict
    return json.dumps(verdict, sort_keys=True)


# ---------------------------------------------------------------------------
# Helpers exposed via fixtures
# ---------------------------------------------------------------------------
def mock_eq_verdict(vm, task_pattern: str, verdict) -> None:
    """Register a verdict that the eq_principle hook returns for this task.

    `task_pattern` is matched against the `task=` argument the contract
    passes to `gl.eq_principle.prompt_non_comparative`.
    """
    body = _verdict_to_string(verdict)
    vm._eq_mocks.append((re.compile(task_pattern), body))


def mock_web_json(vm, url_pattern: str, body, status: int = 200) -> None:
    """Convenience wrapper: mock a web GET that returns JSON."""
    if not isinstance(body, (bytes, bytearray)):
        body = json.dumps(body).encode("utf-8")
    vm.mock_web(url_pattern, {"status": status, "body": body})


def mock_web_404(vm, url_pattern: str) -> None:
    vm.mock_web(url_pattern, {"status": 404, "body": b""})


def gitdrip_json(wallet: str) -> dict:
    return {"maintainer_wallet": wallet}


def gist_payload(login: str, body_text: str, file_name: str = "gitdrip.txt") -> dict:
    return {
        "owner": {"login": login},
        "files": {file_name: {"content": body_text}},
    }


def commit_summary(sha: str, login: str, message: str, *, is_bot: bool = False) -> dict:
    return {
        "sha": sha,
        "author": {"login": login, "type": "Bot" if is_bot else "User"},
        "commit": {"message": message},
    }


def commit_detail(sha: str, additions: int, deletions: int, patch: str = "") -> dict:
    return {
        "sha": sha,
        "stats": {"additions": additions, "deletions": deletions},
        "files": [{"filename": "src/main.py", "patch": patch}],
    }


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture
def contract_path() -> str:
    return str(CONTRACT_PATH)


@pytest.fixture(autouse=True)
def install_hooks(direct_vm):
    """Install eq_principle hook on every direct-mode VM and make ``warp``
    propagate to ``gl.message_raw['datetime']`` (the SDK's default warp only
    patches ``datetime.datetime.now()``)."""
    _install_eq_principle_hook(direct_vm)

    import sys

    original_warp = direct_vm.__class__.warp

    def patched_warp(iso: str) -> None:
        original_warp(direct_vm, iso)
        gl_mod = sys.modules.get("genlayer.gl")
        if gl_mod is not None and getattr(gl_mod, "message_raw", None) is not None:
            gl_mod.message_raw["datetime"] = iso

    # Bind on the instance — shadows the class method during this test.
    direct_vm.warp = patched_warp
    yield
