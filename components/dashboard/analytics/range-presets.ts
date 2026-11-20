// Shared by the analytics page (server) and its filter bar (client). It lives outside the
// "use client" module because server code importing a value from one gets a client reference.
export const RANGE_PRESETS = [7, 30, 90] as const;
