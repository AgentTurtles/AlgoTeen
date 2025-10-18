let loaderPromise;

export default function loadMonaco() {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }

  if (window.monaco) {
    return Promise.resolve(window.monaco);
  }

  if (!loaderPromise) {
    loaderPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector('script[data-monaco-loader]');

      if (existingScript) {
        if (window.monaco) {
          resolve(window.monaco);
          return;
        }

        if (window.require) {
          window.require(['vs/editor/editor.main'], () => resolve(window.monaco), reject);
          return;
        }
      }

      const script = existingScript || document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.49.0/min/vs/loader.min.js';
      script.async = true;
      script.dataset.monacoLoader = 'true';

      script.onload = () => {
        if (!window.require) {
          reject(new Error('Monaco loader did not expose a global require.'));
          return;
        }

        window.require.config({
          paths: {
            vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.49.0/min/vs'
          }
        });

        window.require(['vs/editor/editor.main'], () => {
          resolve(window.monaco);
        }, reject);
      };

      script.onerror = () => {
        reject(new Error('Failed to load Monaco editor resources.'));
      };

      if (!existingScript) {
        document.head.appendChild(script);
      }
    });
  }

  return loaderPromise;
}
