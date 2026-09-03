/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 可选：自定义中文音色 ID（seed-tts-2.0） */
  readonly VITE_VOLC_SPEAKER_ZH?: string;
  /** 可选：自定义英文音色 ID（seed-tts-2.0） */
  readonly VITE_VOLC_SPEAKER_EN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
