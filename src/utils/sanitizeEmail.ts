/**
 * Normalizes an email address for safe display in the UI.
 *
 * Removes characters that can be used for display-spoofing attacks — Unicode
 * bidirectional (RTL/LTR) overrides, zero-width characters, and other control
 * characters — while preserving all characters that are legitimately valid in
 * an email address (including `+` sub-addressing). Trims surrounding whitespace
 * and lowercases the result.
 *
 * This is a display-safety helper, not an email validator.
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return '';

  return (
    email
      .trim()
      .toLowerCase()
      // Strip C0/C1 control characters (includes tabs, newlines, DEL).
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      // Strip bidirectional override/embedding/isolate formatting characters
      // used for RTL spoofing (e.g. U+202E RIGHT-TO-LEFT OVERRIDE).
      .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
      // Strip zero-width and other invisible formatting characters.
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
  );
}
