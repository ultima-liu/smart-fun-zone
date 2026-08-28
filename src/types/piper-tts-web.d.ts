declare module 'piper-tts-web' {
  export class PiperWebEngine {
    constructor(options?: {
      onnxRuntime?: unknown;
      phonemizeRuntime?: unknown;
      expressionRuntime?: { destroy(): void };
      voiceProvider?: { fetch(voice: string): Promise<unknown[]> };
    });
    generate(text: string, voice: string, speaker?: number): Promise<{ file: Blob; duration: number }>;
    destroy(): void;
  }
  export class OnnxWebRuntime {
    constructor(options?: { basePath?: string; numThreads?: number });
  }  export class PhonemizeWebRuntime {
    constructor(options?: { basePath?: string });
  }
  export class RemoteVoiceProvider {
    constructor(options?: { baseUrl?: string; separator?: string });
  }
  export class HuggingFaceVoiceProvider {
    constructor();
  }
}
