/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

export function useKeyboard(keys: string[]) {
  const keyStates: Record<string, boolean> = Object.fromEntries(
    keys.map((key) => [key, false])
  );

  window.addEventListener(
    "keydown",
    (event) => {
      if (keys.includes(event.key)) {
        keyStates[event.key] = true;
        event.preventDefault();
      }
    },
    false
  );

  window.addEventListener(
    "keyup",
    (event) => {
      if (keys.includes(event.key)) {
        event.preventDefault();
      }
    },
    false
  );

  function clearKeyStates() {
    for (const key in keyStates) {
      keyStates[key] = false;
    }
  }

  return { keyStates, clearKeyStates };
}
