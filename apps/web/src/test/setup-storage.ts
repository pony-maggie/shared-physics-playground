function installMemoryStorage(target: "localStorage" | "sessionStorage") {
  const current = window[target];

  if (
    current &&
    typeof current.getItem === "function" &&
    typeof current.setItem === "function" &&
    typeof current.removeItem === "function" &&
    typeof current.clear === "function"
  ) {
    return;
  }

  const values = new Map<string, string>();
  const storage = {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.has(key) ? values.get(key)! : null;
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(String(key), String(value));
    },
  } satisfies Storage;

  Object.defineProperty(window, target, {
    configurable: true,
    value: storage,
  });
}

installMemoryStorage("localStorage");
installMemoryStorage("sessionStorage");
