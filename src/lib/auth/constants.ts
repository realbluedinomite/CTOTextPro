export const SESSION_COOKIE_NAME = 'ctotextpro_session';

// Firebase session cookies can live for a maximum of 14 days. The defaults
// below keep regular sessions reasonably short while enabling an extended
// duration when the user selects "remember me".
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 5; // 5 days
export const SESSION_REMEMBER_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

// When a session has less remaining time than this threshold, the client should
// refresh the underlying ID token so a fresh session cookie can be minted.
export const SESSION_REFRESH_THRESHOLD_MS = 1000 * 60 * 60 * 12; // 12 hours
