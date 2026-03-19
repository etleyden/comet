/**
 * Centralized API error handling utilities.
 *
 * ## Error Display Guidelines
 *
 * **Use notification toast (`notify()`)** for:
 * - Background operations (assigning a vendor, health checks)
 * - Non-form actions (deleting items, toggling state)
 * - Secondary failures after a primary success ("Account created, but failed to auto-select")
 *
 * **Use inline errors (local state + `<Alert>` or `<Typography color="error">`)** for:
 * - Form submission errors where the user can fix the input and retry
 *   (login, register, create/edit modals)
 * - Validation errors tied to specific fields
 *
 * **Combining both** is appropriate when a form error should persist on screen (inline)
 * AND the user should be notified even if the form is scrolled out of view (toast).
 * Avoid this unless the form is long or the error is critical.
 */

// ApiError lives in shared/ so the class definition is consistent between
// the backend (which throws it) and the frontend (which catches it).
import { ApiError } from 'shared';
export { ApiError };

/* ------------------------------------------------------------------ */
/*  parseApiError                                                      */
/* ------------------------------------------------------------------ */

const MESSAGE_PLACEHOLDER = '${message}';
const FALLBACK_MESSAGE = 'Something went wrong';

/**
 * Formats a caught error into a user-facing string using an optional template.
 *
 * The template may contain `${message}` which is replaced with the message
 * extracted from the error. If omitted the default template is used.
 *
 * ```ts
 * // Default — "Error: Invalid login credentials"
 * parseApiError(err)
 *
 * // Custom template — "Failed to save: Account not found"
 * parseApiError(err, 'Failed to save: ${message}')
 *
 * // Static override (no placeholder) — "Operation failed"
 * parseApiError(err, 'Operation failed')
 * ```
 *
 * @param error    The caught value (Error, ApiError, string, or unknown)
 * @param template Optional display template (default: `"Error: ${message}"`)
 */
export function parseApiError(error: unknown, template = `Error: ${MESSAGE_PLACEHOLDER}`): string {
  const message = extractMessage(error);
  return template.includes(MESSAGE_PLACEHOLDER)
    ? template.replace(MESSAGE_PLACEHOLDER, message)
    : template;
}

/** Pulls a raw message string out of any caught value. */
function extractMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const raw = error.message ?? '';
    const trimmed = raw.trim();
    return trimmed || FALLBACK_MESSAGE;
  }
  if (error instanceof Error) return error.message.trim() || FALLBACK_MESSAGE;
  if (typeof error === 'string' && error.trim()) return error.trim();
  return FALLBACK_MESSAGE;
}
