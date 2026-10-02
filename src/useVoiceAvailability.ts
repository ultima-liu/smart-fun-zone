import { useSyncExternalStore } from 'react';
import { volcConfigured } from './volcTts';

function subscribe(onChange: () => void) {
  window.addEventListener('volc-tts-configured', onChange);
  return () => window.removeEventListener('volc-tts-configured', onChange);
}

export function useVoiceAvailability() {
  return useSyncExternalStore(subscribe, volcConfigured);
}
