declare module 'espeak-ng' {
  const ESpeakNG: (opts: {
    arguments: string[];
    locateFile?: (path: string) => string;
  }) => Promise<{
    FS: { readFile(path: string): Uint8Array };
  }>;
  export default ESpeakNG;
}
