const ERROR_MAP: Record<string, string> = {
  "already_registered": "this repo is already registered.",
  "no_repo": "this repo hasn't been registered yet. the maintainer needs to register it first.",
  "ownership_proof_failed": "could not verify ownership. make sure .gitdrip.json is committed to the default branch with the correct wallet.",
  "opt_in_proof_failed": "gist verification failed. make sure the gist is public, owned by your account, and contains the exact expected string.",
  "roster_full": "this repo has reached the maximum number of enrolled contributors (50).",
  "zero_value": "amount must be greater than zero.",
  "below_min": "minimum sponsor deposit is 10 GEN.",
  "period_too_short": "distribution can only run once every 7 days. try again later.",
  "release_already_distributed": "this release tag has already been distributed.",
  "not_dormant": "refunds are only available after 180 days with no distribution.",
  "not_sponsor": "only the original sponsor can request a refund for this deposit.",
  "already_refunded": "this deposit has already been refunded.",
  "pool_drained": "the pool has been fully distributed. nothing left to refund.",
  "no_deposit": "deposit not found.",
  "tag_required": "a release tag is required for this type of distribution.",
};

/**
 * Takes a raw error message (from contract or tx revert) and returns
 * a human-readable version. Strips the [EXPECTED]/[LLM_ERROR] prefixes.
 */
export function humanError(raw: string): string {
  if (!raw) return "something went wrong. try again.";

  // Strip prefixes: "[EXPECTED] no_repo" -> "no_repo"
  const stripped = raw
    .replace(/^\[EXPECTED\]\s*/i, "")
    .replace(/^\[EXTERNAL\]\s*/i, "")
    .replace(/^\[LLM_ERROR\]\s*/i, "")
    .replace(/^UserError\(message='(.*)'\)$/i, "$1")
    .replace(/^\[EXPECTED\]\s*/i, "")
    .trim();

  const mapped = ERROR_MAP[stripped];
  if (mapped) return mapped;

  // If it contains a known key as substring
  for (const [key, msg] of Object.entries(ERROR_MAP)) {
    if (stripped.includes(key)) return msg;
  }

  // Fallback: clean up and return
  if (stripped.length > 100) return "transaction failed. check the explorer for details.";
  return stripped.toLowerCase();
}
