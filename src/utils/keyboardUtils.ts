/**
 * Detects whether the user is currently typing into an input, textarea, select,
 * contentEditable element, or ARIA textbox/combobox widget.
 */
export function isTypingInInputElement(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement | null;
  if (!target) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    Boolean(target.isContentEditable) ||
    target.getAttribute('role') === 'textbox' ||
    target.getAttribute('role') === 'combobox'
  );
}
