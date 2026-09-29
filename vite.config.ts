import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
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
    // 前端端口统一固定为 5173（dev 与 preview 一致）；strictPort 保证端口被占时直接报错，
    // 绝不自动漂移到其他端口，避免"访问地址一直在变"。
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      proxy: apiProxy,
    },
    preview: {
      host: true,
      port: 5173,
      strictPort: true,
      proxy: apiProxy,
    },
    // 前端不读取服务端密钥；运行时由 /api/health 回填真实配置状态。
    define: {
      __VOLC_TTS_KEY_PRESENT__: JSON.stringify(false),
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
