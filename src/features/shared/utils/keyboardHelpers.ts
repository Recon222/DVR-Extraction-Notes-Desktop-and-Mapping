/**
 * Keyboard Event Utilities
 *
 * Helper functions for working with keyboard events and shortcuts.
 * These utilities help prevent keyboard shortcuts from interfering with
 * normal user input in form fields.
 */

/**
 * Check if the user is currently typing in a form field
 *
 * This function is used to determine whether keyboard shortcuts should be
 * ignored. When a user is typing in an input field, textarea, or select element,
 * we don't want keyboard shortcuts to interfere with their input.
 *
 * Example Usage:
 * ```typescript
 * const handleKeyDown = (event: KeyboardEvent) => {
 *   // Don't handle shortcuts while user is typing
 *   if (isTypingInFormField(event)) {
 *     return;
 *   }
 *
 *   // Handle keyboard shortcuts here...
 * };
 * ```
 *
 * @param event - The keyboard event to check
 * @returns true if the user is typing in a form field, false otherwise
 */
export function isTypingInFormField(event: KeyboardEvent): boolean {
  const target = event.target;

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

/**
 * Check if the user is typing in an editable element
 *
 * This is a more comprehensive version of isTypingInFormField that also
 * checks for contentEditable elements. Use this if you need to handle
 * rich text editors or other editable content.
 *
 * @param event - The keyboard event to check
 * @returns true if the user is typing in any editable element, false otherwise
 */
export function isTypingInEditableElement(event: KeyboardEvent): boolean {
  const target = event.target;

  // Check standard form fields
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return true;
  }

  // Check for contentEditable elements
  if (target instanceof HTMLElement && target.isContentEditable) {
    return true;
  }

  return false;
}
