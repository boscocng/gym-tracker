"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";

type Received = { text: string; enterSeen: boolean; at: string };

function unusualCharacters(text: string): string {
  const codes = Array.from(text)
    .map((character) => character.codePointAt(0) ?? 0)
    .filter((code) => code < 0x20 || code > 0x7e)
    .map((code) => `U+${code.toString(16).toUpperCase().padStart(4, "0")}`);
  return codes.length === 0 ? "none" : codes.join(" ");
}

function describe(text: string): string {
  return `${JSON.stringify(text)}\nlength ${text.length}, non-ASCII or control characters: ${unusualCharacters(text)}`;
}

export function DictationTest() {
  const [value, setValue] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [received, setReceived] = useState<Received[]>([]);
  const enterSeen = useRef(false);

  function handleInput(event: FormEvent<HTMLInputElement>) {
    const native = event.nativeEvent as InputEvent;
    const entry = `${native.inputType || "(no inputType)"} ${JSON.stringify(native.data)}`;
    setEvents((previous) => [entry, ...previous].slice(0, 8));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") enterSeen.current = true;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const entry = { text: value, enterSeen: enterSeen.current, at: new Date().toLocaleTimeString() };
    enterSeen.current = false;
    setReceived((previous) => [entry, ...previous]);
    setValue("");
  }

  return (
    <section>
      <h2>1. Dictation</h2>
      <p>
        Switch to the Wispr Flow keyboard, dictate a set (for example &quot;bench press, first set, fifty
        pounds, eight reps&quot;), then tap the keyboard&apos;s return key. Repeat with a few more phrases.
      </p>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="send"
          placeholder="bench 185 for 6"
        />
        <div className="row">
          <button className="primary" type="submit">
            Log
          </button>
        </div>
      </form>
      <pre>{`Live value: ${describe(value)}`}</pre>
      <pre>{`Last input events (newest first):\n${events.join("\n") || "none yet"}`}</pre>
      {received.map((entry, index) => (
        <pre key={`${entry.at}-${index}`}>
          {`Received at ${entry.at} (Enter key seen: ${entry.enterSeen ? "yes" : "no"})\n${describe(entry.text)}`}
        </pre>
      ))}
    </section>
  );
}
