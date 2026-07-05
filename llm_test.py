#!/usr/bin/env python3
import argparse
import json
import os
import sys
import urllib.error
import urllib.request


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Simple LLM test runner.")
    parser.add_argument("--prompt", required=True, help="User prompt to send to the model.")
    parser.add_argument("--system", default="You are a helpful assistant.", help="System message.")
    parser.add_argument("--model", default=os.getenv("LLM_MODEL", "gpt-4o-mini"), help="Model name.")
    parser.add_argument(
        "--timeout",
        type=int,
        default=int(os.getenv("LLM_TIMEOUT", "60")),
        help="HTTP timeout in seconds.",
    )
    parser.add_argument("--dry-run", dest="dry_run", action="store_true", help="Print request payload only.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    api_key = os.getenv("OPENAI_API_KEY")
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")

    payload = {
        "model": args.model,
        "messages": [
            {"role": "system", "content": args.system},
            {"role": "user", "content": args.prompt},
        ],
    }

    if args.dry_run:
        print(json.dumps(payload, indent=2))
        return 0

    if not api_key:
        print("Error: OPENAI_API_KEY is not set.", file=sys.stderr)
        return 1

    bearer_prefix = "Bearer"
    request = urllib.request.Request(
        f"{base_url}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"{bearer_prefix} {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=args.timeout) as response:
            body = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        error_body = err.read().decode("utf-8", errors="replace")
        print(f"HTTP error {err.code}: {error_body}", file=sys.stderr)
        return 1
    except urllib.error.URLError as err:
        print(f"Network error: {err}", file=sys.stderr)
        return 1

    try:
        content = body["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        print(f"Unexpected response format: {json.dumps(body)}", file=sys.stderr)
        return 1

    print(content)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
