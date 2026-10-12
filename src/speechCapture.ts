/** 前台收音独占识别通道；后台唤醒和自动播报在此期间让出声音。 */
let current: { cancel: () => void } | null = null;
const listeners = new Set<() => void>();
const publish = () => listeners.forEach(listener => listener());
export const speechCaptureActive = () => current !== null;
export function subscribeSpeechCapture(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function beginSpeechCapture(cancel: () => void) {
  current?.cancel();
  const session = { cancel };
  current = session;
  publish();
  return () => {
    if (current !== session) return;
    current = null;
    publish();
  };
}
