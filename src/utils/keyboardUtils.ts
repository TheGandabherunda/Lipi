/**
 * Detects whether the user is currently typing into an input, textarea, select,
 * contentEditable element, or ARIA textbox/combobox widget.
 */
export function isTypingInInputElement(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement | null;
  if (!target) return false;
  const tag = target.tagName;
  if (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    Boolean(target.isContentEditable)
  ) {
    return true;
  }
  if (typeof target.closest === 'function') {
    if (
      target.closest('input, textarea, select, [contenteditable="true"]') ||
      target.closest('[role="textbox"], [role="combobox"]')
    ) {
      return true;
    }
  }
  return (
    target.getAttribute('role') === 'textbox' ||
    target.getAttribute('role') === 'combobox'
  );
}
