"use client";

import * as React from "react";

// Shared minute clock for relative times. Null while server rendering and hydrating, so times are
// only formatted in the browser (its locale and time zone), never mismatching the server HTML.
let clockNow = 0;
let clockTimer: ReturnType<typeof setInterval> | undefined;
const clockListeners = new Set<() => void>();
function subscribeClock(onChange: () => void) {
  clockListeners.add(onChange);
  clockTimer ??= setInterval(() => {
    clockNow = Date.now();
    clockListeners.forEach((l) => l());
  }, 60_000);
  return () => {
    clockListeners.delete(onChange);
    if (clockListeners.size === 0) {
      clearInterval(clockTimer);
      clockTimer = undefined;
    }
  };
}
export const useNow = () =>
  React.useSyncExternalStore(
    subscribeClock,
    () => (clockNow ||= Date.now()),
    () => null
  );
