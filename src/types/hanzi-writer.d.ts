declare module 'hanzi-writer' {
  export default class HanziWriter {
    static create(
      element: HTMLElement | string,
      character: string,
      options?: {
        width?: number;
        height?: number;
        padding?: number;
        showOutline?: boolean;
        showCharacter?: boolean;
        strokeAnimationSpeed?: number;
        strokeColor?: string;
        charDataLoader?: (char: string, onLoad: (data: { strokes: string[]; medians: number[][][] }) => void, onError: (error?: Error) => void) => void;
        highlightColor?: string;
        leniency?: number;
        averageDistanceThreshold?: number;
      },
    ): HanziWriter;
    showCharacter(): void;
    showOutline(): void;
    hideCharacter(): void;
    animateCharacter(options?: { onComplete?: () => void }): void;
    setCharacter(character: string): void;
    /** 描写（描红）模式：孩子沿笔画描摹 */
    quiz(options?: {
      showHintAfterMisses?: number | false;
      onComplete?: () => void;
      onCorrectStroke?: () => void;
      onMistake?: () => void;
    }): void;
    destroy(): void;
    pauseAnimation(): void;
    cancelQuiz(): void;
  }
}
