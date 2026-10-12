/** Only filled key information counts as the child's answer; supplied copy alone is not evidence. */
export function completedSentence(frame: string, values: readonly string[]): string {
  const parts = frame.split(/_{2,}/u);
  if (parts.length < 2 || values.length !== parts.length - 1 || values.some(value => typeof value !== 'string' || !value.trim())) return '';
  return parts.reduce((sentence, part, index) => sentence + (index ? values[index - 1].trim() : '') + part, '');
}
