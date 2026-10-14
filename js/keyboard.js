const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable]';

/**
 * Listens for key presses and reports them as lowercase key names.
 * Ignores held-key repeats, Ctrl/Alt/Meta combinations, IME composition
 * and typing inside form fields. Knows nothing about audio or pads.
 * @param {(key: string) => (boolean | void)} onKey Called with the lowercase key.
 *   Return true when the key was handled so the browser default is prevented.
 * @returns {() => void} Function that removes the listener.
 */
export function bindKeyboard(onKey) {
  function handleKeydown(event) {
    if (event.repeat || event.isComposing) {
      return;
    }
    if (event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }
    if (event.target instanceof Element && event.target.closest(EDITABLE_SELECTOR)) {
      return;
    }
    if (onKey(event.key.toLowerCase()) === true) {
      event.preventDefault();
    }
  }

  window.addEventListener('keydown', handleKeydown);
  return () => {
    window.removeEventListener('keydown', handleKeydown);
  };
}
