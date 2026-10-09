// Runs before the app bundle. Keep in sync with THEME_STORAGE_KEY in src/app/theme.tsx.
(function () {
  try {
    var preference = window.localStorage.getItem('stint:theme');
    if (preference === 'light' || preference === 'dark') {
      document.documentElement.setAttribute('data-theme', preference);
    }
  } catch (error) {
    // Storage can be unavailable (private mode, blocked cookies); fall back to the OS theme.
  }
})();
