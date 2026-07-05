# first-project

Minimal starter to test an LLM from scratch.

## Quick start

1. Ensure Python 3.9+ is installed.
2. Set your API key:

```bash
export OPENAI_API_KEY="your_api_key_here"
```

3. Run a test prompt:

```bash
python /home/runner/work/first-project/first-project/llm_test.py --prompt "Hello, who are you?"
```

## Optional configuration

- `OPENAI_BASE_URL` (default: `https://api.openai.com/v1`)
- `LLM_MODEL` (default: `gpt-4.1-mini`)

You can also pass a model directly:

```bash
python /home/runner/work/first-project/first-project/llm_test.py --model gpt-4.1-mini --prompt "Write one line about test automation."
```
