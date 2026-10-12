import { useCallback, useEffect, useRef, useState } from 'react';
import { blobDataUrl, recordingToWav } from './courseAssessment';
import { openReadingMicrophone, type ReadingMicrophone } from './readingMicrophone';
import { beginSpeechCapture } from './speechCapture';

/** Page microphone -> our ASR service. The expected answer is never sent to this service. */
export function useLocalReadingAsr(onResult: (text: string) => void, singleWord: boolean) {
  const [state, setState] = useState({
    supported: false,
    listening: false,
    preparing: false,
    finishing: false,
    said: '',
    draft: '',
    error: '',
    audioUrl: '',
    device: '',
    level: 0,
    explicitTrack: false,
  });
  const input = useRef<ReadingMicrophone | null>(null),
    release = useRef<(() => void) | null>(null);
  const request = useRef<AbortController | null>(null),
    timer = useRef<number>();
  const generation = useRef(0),
    audioUrl = useRef('');
  const callback = useRef(onResult);
  callback.current = onResult;
  const clearRecording = useCallback(() => {
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = '';
    setState((s) => ({ ...s, audioUrl: '', device: '', level: 0, explicitTrack: false }));
  }, []);
  const stop = useCallback(() => {
    generation.current++;
    window.clearTimeout(timer.current);
    request.current?.abort();
    request.current = null;
    input.current?.close(false);
    input.current = null;
    release.current?.();
    release.current = null;
    setState((s) => ({ ...s, listening: false, preparing: false, finishing: false, level: 0 }));
  }, []);
  const finish = useCallback(() => {
    const microphone = input.current;
    if (!microphone) return;
    input.current = null;
    window.clearTimeout(timer.current);
    setState((s) => ({ ...s, listening: false, preparing: false, finishing: true, level: 0 }));
    microphone.close(true);
    release.current?.();
    release.current = null;
  }, []);
  const start = useCallback(() => {
    stop();
    clearRecording();
    const attempt = generation.current,
      receive = callback.current;
    release.current = beginSpeechCapture(stop);
    setState((s) => ({
      ...s,
      listening: true,
      preparing: true,
      finishing: false,
      said: '',
      draft: '',
      error: '',
    }));
    timer.current = window.setTimeout(() => {
      if (generation.current === attempt) {
        stop();
        setState((s) => ({ ...s, error: '麦克风启动超时，请再试一次。' }));
      }
    }, 12_000);
    let spoke = false,
      lastSound = 0;
    void openReadingMicrophone(
      (level) => {
        if (generation.current !== attempt || !input.current) return;
        setState((s) => ({ ...s, level }));
        if (level > 0.05) {
          spoke = true;
          lastSound = performance.now();
        }
        // This only ends capture after a pause; sound level can never mark a reading as correct.
        if (spoke && performance.now() - lastSound > (singleWord ? 1000 : 1800)) finish();
      },
      (blob) => {
        if (generation.current !== attempt) return;
        audioUrl.current = URL.createObjectURL(blob);
        setState((s) => ({ ...s, audioUrl: audioUrl.current, level: 0 }));
        const controller = new AbortController();
        request.current = controller;
        const timeout = window.setTimeout(() => controller.abort(), 50_000);
        void (async () => {
          try {
            const wav = await recordingToWav(blob),
              url = await blobDataUrl(wav);
            if (generation.current !== attempt) return;
            const token = localStorage.getItem('sfz_token');
            const response = await fetch('/api/reading-asr/transcribe', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              signal: controller.signal,
              body: JSON.stringify({ language: 'en-US', audio: url.split(',')[1] }),
            });
            const result = (await response.json()) as {
              ok?: boolean;
              text?: string;
              engine?: string;
              error?: string;
            };
            if (generation.current !== attempt) return;
            if (
              !response.ok ||
              !result.ok ||
              typeof result.text !== 'string' ||
              result.engine !== 'sense-voice'
            )
              throw new Error(result.error || '英语朗读识别没有完成，请再试一次。');
            const text = result.text;
            setState((s) => ({
              ...s,
              said: text,
              error: text.trim() ? '' : '没有识别出文字，可以回听本次录音。',
            }));
            if (text.trim()) receive(text);
          } catch (error) {
            if (generation.current === attempt)
              setState((s) => ({
                ...s,
                error: controller.signal.aborted
                  ? '朗读识别超时，请再试一次。'
                  : error instanceof Error
                    ? error.message
                    : '朗读识别没有完成，请再试一次。',
              }));
          } finally {
            window.clearTimeout(timeout);
            if (generation.current === attempt) {
              request.current = null;
              setState((s) => ({ ...s, listening: false, preparing: false, finishing: false }));
            }
          }
        })();
      },
      (device) => {
        if (generation.current === attempt)
          setState((s) => ({ ...s, device, explicitTrack: true }));
      },
      {
        requireRecording: true,
        onError: () => {
          if (generation.current === attempt) {
            stop();
            setState((s) => ({ ...s, error: '本次录音中断，请再试一次。' }));
          }
        },
      },
    )
      .then((microphone) => {
        if (generation.current !== attempt) {
          microphone.close(false);
          return;
        }
        input.current = microphone;
        window.clearTimeout(timer.current);
        setState((s) => ({ ...s, preparing: false }));
        timer.current = window.setTimeout(finish, singleWord ? 12_000 : 44_000);
      })
      .catch((error) => {
        if (generation.current !== attempt) return;
        stop();
        setState((s) => ({
          ...s,
          error:
            error instanceof DOMException && error.name === 'NotAllowedError'
              ? '请允许麦克风后再读一次。'
              : '没有可用的麦克风，请检查输入设备。',
        }));
      });
  }, [stop, clearRecording, finish, singleWord]);
  useEffect(() => {
    setState((s) => ({
      ...s,
      supported:
        typeof navigator.mediaDevices?.getUserMedia === 'function' &&
        typeof MediaRecorder !== 'undefined',
    }));
    return () => {
      stop();
      clearRecording();
    };
  }, [stop, clearRecording]);
  return { ...state, start, stop, finish, clearRecording };
}
