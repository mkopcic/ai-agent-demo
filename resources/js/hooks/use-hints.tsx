import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'hints-enabled';

const listeners = new Set<() => void>();
let hintsEnabled = true;

const subscribe = (callback: () => void) => {
    listeners.add(callback);

    return () => listeners.delete(callback);
};

const notify = (): void => listeners.forEach((listener) => listener());

export function initializeHints(): void {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem(STORAGE_KEY);
    hintsEnabled = stored === null ? true : stored === 'true';
}

export function useHints() {
    const enabled = useSyncExternalStore(
        subscribe,
        () => hintsEnabled,
        () => true,
    );

    const setHintsEnabled = useCallback((value: boolean): void => {
        hintsEnabled = value;
        localStorage.setItem(STORAGE_KEY, String(value));
        notify();
    }, []);

    return { hintsEnabled: enabled, setHintsEnabled } as const;
}
