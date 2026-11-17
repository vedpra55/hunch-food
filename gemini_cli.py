#!/usr/bin/env python3
"""Small interactive CLI for Gemini Interactions API."""

from getpass import getpass

from google import genai


MODEL = "models/gemini-4-hydrogen"


def main() -> None:
    print("Gemini CLI")
    print("Type 'exit' or 'quit' to leave.\n")

    api_key = getpass("Gemini API key: ").strip()
    if not api_key:
        raise SystemExit("An API key is required.")

    client = genai.Client(api_key=api_key)

    while True:
        try:
            prompt = input("\nYou: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            return

        if not prompt:
            continue
        if prompt.lower() in {"exit", "quit"}:
            print("Goodbye!")
            return

        try:
            interaction = client.interactions.create(
                model=MODEL,
                input=prompt,
                generation_config={
                    "max_output_tokens": 65536,
                    "thinking_level": "high",
                },
            )
        except Exception as error:
            print(f"\nGemini request failed: {error}")
            continue

        print(f"\nGemini: {interaction.output_text}")


if __name__ == "__main__":
    main()
