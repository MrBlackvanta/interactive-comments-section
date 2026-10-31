type ChangeListener = (event: MediaQueryListEvent) => void;

const listeners = new Map<string, Set<ChangeListener>>();
let matching = new Set<string>();

export function installMatchMedia(queries: readonly string[] = []) {
  listeners.clear();
  matching = new Set(queries);

  window.matchMedia = (query: string) => {
    const subscribers = listeners.get(query) ?? new Set<ChangeListener>();
    listeners.set(query, subscribers);

    return {
      get matches() {
        return matching.has(query);
      },
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: ChangeListener) =>
        subscribers.add(listener),
      removeEventListener: (_type: string, listener: ChangeListener) =>
        subscribers.delete(listener),
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
  };
}

export function setMediaMatch(query: string, matches: boolean) {
  if (matches) matching.add(query);
  else matching.delete(query);

  const event = { matches, media: query } as MediaQueryListEvent;
  listeners.get(query)?.forEach((listener) => listener(event));
}

export function mediaListenerCount(query: string) {
  return listeners.get(query)?.size ?? 0;
}
