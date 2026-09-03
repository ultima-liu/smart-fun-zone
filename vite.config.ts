import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // 服务端密钥：.env.local 中的 VOLC_SPEECH_API_KEY（不带 VITE_ 前缀，不进前端包）
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.VOLC_SPEECH_API_KEY?.trim() ?? '';
  const ttsProxy = {
    // 前端请求 /api/volc-tts/... → 代理到火山引擎，服务端注入 X-Api-Key（避免 CORS 与密钥泄露）
    '/api/volc-tts': {
      target: 'https://openspeech.bytedance.com',
      changeOrigin: true,
      rewrite: (p: string) => p.replace(/^\/api\/volc-tts/, ''),
      headers: apiKey ? { 'X-Api-Key': apiKey } : undefined,
    },
  };

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      proxy: ttsProxy,
    },
    preview: {
      proxy: ttsProxy,
    },
    // 构建期注入"密钥是否已配置"标记（页面据此显示配置提示）
    define: {
      __VOLC_TTS_KEY_PRESENT__: JSON.stringify(apiKey !== ''),
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
  };
});
