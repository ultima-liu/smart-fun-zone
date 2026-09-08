import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // 服务端密钥：.env.local 中的 VOLC_SPEECH_API_KEY（不带 VITE_ 前缀，不进前端包）
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.VOLC_SPEECH_API_KEY?.trim() ?? '';
  // 前端 /api/* 全部代理到本地服务端（Fastify，端口 8787）；
  // TTS 代理、内容包、账号、同步等均由服务端承载。
  const apiProxy = {
    '/api': {
      target: 'http://127.0.0.1:8787',
      changeOrigin: true,
    },
  };

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      proxy: apiProxy,
    },
    preview: {
      proxy: apiProxy,
    },
    // 构建期注入"服务端密钥是否已配置"标记（页面据此显示配置提示；服务端 /api/health 会覆盖该值）
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
