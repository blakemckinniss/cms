// sms-generator-frontend/utils.js
// Shared utility functions for the frontend application.

/**
 * Auto-resizes a textarea element based on its content.
 * @param {HTMLTextAreaElement} textarea - The textarea element to resize.
 */
export function autoResizeTextarea(textarea) {
    if (!textarea || textarea.tagName !== 'TEXTAREA') return;
    textarea.style.height = 'auto'; // Reset height to correctly calculate scrollHeight
    // Set a minimum height based on CSS or desired look (e.g., 2 rows)
    const minHeight = parseInt(getComputedStyle(textarea).getPropertyValue('min-height')) || 40;
    textarea.style.height = Math.max(minHeight, textarea.scrollHeight) + 'px';
}

/**
 * Triggers an 'input' event on an element. Useful after programmatically changing its value.
 * @param {HTMLElement} element - The element to dispatch the event on.
 */
export function triggerInputEvent(element) {
    if (!element) return;
    const inputEvent = new Event('input', { bubbles: true, cancelable: true });
    element.dispatchEvent(inputEvent);
}

/**
 * Basic sanitizer function to prevent XSS from text content.
 * Assigns the string to textContent of a temporary element and returns its innerHTML.
 * @param {string} str - The string to sanitize.
 * @returns {string} The sanitized string (HTML entities encoded).
 */
export function sanitize(str) {
    if (typeof str !== 'string') return '';
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

/**
 * Debounces a function, ensuring it's only called after a certain delay
 * since the last time it was invoked.
 * @param {Function} func - The function to debounce.
 * @param {number} delay - The debounce delay in milliseconds.
 * @returns {Function} The debounced function.
 */
export function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}