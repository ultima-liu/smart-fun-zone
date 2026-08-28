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
        highlightColor?: string;
      },
    ): HanziWriter;
    showCharacter(): void;
    hideCharacter(): void;
    animateCharacter(options?: { onComplete?: () => void }): void;
    setCharacter(character: string): void;
    /** 描写（描红）模式：孩子沿笔画描摹 */
    quiz(options?: {
      onComplete?: () => void;
      onCorrectStroke?: () => void;
      onMistake?: () => void;
    }): void;
    destroy(): void;
  }
}
