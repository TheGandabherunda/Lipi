/**
 * Detects whether the user is currently typing into an input, textarea, select,
 * contentEditable element, or ARIA text/input widget (textbox, combobox, searchbox, spinbutton).
 */
export function isTypingInInputElement(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement | null;
  if (!target) return false;
  if (target.isContentEditable) return true;

  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }

  if (typeof target.closest === 'function') {
    if (
      target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])') ||
      target.closest('[role="textbox"], [role="combobox"], [role="searchbox"], [role="spinbutton"]')
    ) {
      return true;
    }
  }

  const role = typeof target.getAttribute === 'function' ? target.getAttribute('role') : null;
  return role === 'textbox' || role === 'combobox' || role === 'searchbox' || role === 'spinbutton';
}
