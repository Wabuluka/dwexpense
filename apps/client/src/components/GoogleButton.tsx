import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void;
          renderButton: (el: HTMLElement, config: object) => void;
        };
      };
    };
  }
}

interface Props {
  onSuccess: (idToken: string) => void;
  onError: (msg: string) => void;
}

export function GoogleButton({ onSuccess, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function init() {
      if (!window.google || !containerRef.current) return;
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: (response: { credential?: string }) => {
          if (response.credential) {
            onSuccess(response.credential);
          } else {
            onError('Google sign-in failed');
          }
        },
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: 'outline',
        size: 'large',
        width: containerRef.current.offsetWidth || 400,
        text: 'continue_with',
      });
    }

    if (window.google) {
      init();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = init;
    document.body.appendChild(script);
  }, [onSuccess, onError]);

  return <div ref={containerRef} className="w-full" />;
}
