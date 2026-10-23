import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError, messageOf } from '../api/client';

/**
 * Puts the API's per-field messages onto the matching form fields.
 * Returns a general message for the form banner when nothing could be mapped to a field.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fieldNames: string[],
): string | null {
  if (error instanceof ApiError && error.fields) {
    let mapped = false;
    for (const [key, messages] of Object.entries(error.fields)) {
      if (fieldNames.includes(key) && messages.length > 0) {
        setError(key as Path<T>, { type: 'server', message: messages[0] });
        mapped = true;
      }
    }
    if (mapped) return null;
  }
  return messageOf(error);
}
