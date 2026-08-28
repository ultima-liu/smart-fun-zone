import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const crossOriginIsolationHeaders = {
  // 允许 onnxruntime（Piper 离线神经语音）使用线程 —— 需要跨源隔离
  'Cross-Origin-Opener-Policy': 'same-origin',
  // credentialless：既满足隔离，又不阻塞 hanzi-writer 等带 CORS 的跨源资源
  'Cross-Origin-Embedder-Policy': 'credentialless',
};

export default defineConfig({
  plugins: [
    react(),
    // 语音引擎二进制（onnx wasm / espeak-ng 等，共 ~125MB）不存入 git，
    // 构建与开发时自动从 node_modules（piper-tts-web、espeak-ng npm 包）复制，
    // 仓库因此瘦身；语音模型（voices/*.onnx）需另行下载，见 scripts/fetch-voices.mjs
    viteStaticCopy({
      targets: [
        { src: 'node_modules/piper-tts-web/dist/onnx/*', dest: 'piper/onnx' },
        { src: 'node_modules/piper-tts-web/dist/piper/*', dest: 'piper/piper' },
        { src: 'node_modules/piper-tts-web/dist/worker/*', dest: 'piper/worker' },
        { src: 'node_modules/espeak-ng/dist/espeak-ng.wasm', dest: '.' },
      ],
    }),
  ],
  server: {
    host: true,
    port: 5173,
    headers: crossOriginIsolationHeaders,
  },
  preview: {
    headers: crossOriginIsolationHeaders,
  },
  build: {
    rollupOptions: {
      output: {
        // 稳定拆分：第三方库与业务代码分离，利于浏览器长期缓存
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'zustand'],
          'lesson-tools': ['hanzi-writer', 'pinyin-pro'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
});
