# Contributing

Thanks for helping improve Cosmic Venturer.

## Local Development

1. Create a Python 3.12 virtual environment.
2. Install dependencies with `pip install -r requirements.txt pytest`.
3. Run tests with `PYTHONPATH=. pytest -q`.
4. Start the app with `uvicorn backend.main:app --reload`.

## Pull Requests

- Keep changes focused.
- Add or update tests for backend logic.
- Do not commit generated videos, runtime frames, virtual environments, or local `.DS_Store` files.
- For UI changes, verify the page at `http://127.0.0.1:8000`.
