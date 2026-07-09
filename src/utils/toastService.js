let toastCallback = null;

export function registerToast(cb) {
  toastCallback = cb;
}

export function unregisterToast() {
  toastCallback = null;
}

export function showToast(message, type = 'success', duration = 3000) {
  if (toastCallback) {
    toastCallback(message, type, duration);
  }
}

export default { registerToast, unregisterToast, showToast };
