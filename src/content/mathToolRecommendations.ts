/** A lesson selects a representation and materials; opening it never awards course progress. */
const RECOMMENDATIONS: Record<string, Record<string, string>> = {
  compare: { tool: 'pair', left: '3', right: '3' },
  'compare-order-nine': { tool: 'pair', left: '6', right: '8' },
  compose: { tool: 'partition', total: '5' },
  'compose-six-nine': { tool: 'partition', total: '8' },
  'addsub-six-seven': { tool: 'partition', total: '6' },
  'addsub-eight-nine': { tool: 'partition', total: '8' },
  'plus-nine': { tool: 'ten', first: '9', second: '4' },
  'plus-eight-seven-six': { tool: 'ten', first: '8', second: '5' },
  'plus-eight-nine-strategies': { tool: 'ten', first: '8', second: '9' },
  'unit5-review': { tool: 'ten', first: '7', second: '8' },
  'ten-again': { tool: 'value', first: '10', second: '0', operator: '+' },
  'eleven-twenty': { tool: 'value', first: '15', second: '0', operator: '+' },
  'simple-addsub-twenty': { tool: 'value', first: '13', second: '2', operator: '+' },
  'order-twenty': { tool: 'line', min: '10', max: '20' },
  'between-positions': { tool: 'line', mode: 'between', min: '10', max: '15' },
  'unit4-review': { tool: 'line', min: '0', max: '20' },
  'continuous-add-sub': { tool: 'partition', mode: 'changes' },
  'mixed-add-sub': { tool: 'partition', mode: 'changes' },
  'find-original': { tool: 'partition', mode: 'original', total: '5', known: '6' },
  'review-application': { tool: 'partition', mode: 'original', total: '5', known: '8' },
  'solve-remain-within-7': { tool: 'partition', mode: 'hidden', total: '7', known: '2' },
  'select-info-eight-nine': { tool: 'partition', mode: 'hidden', total: '9', known: '3' },
  playground: { tool: 'group', total: '6' },

};

export function mathToolRoute(lessonId: string): string | null {
  const material = RECOMMENDATIONS[lessonId];
  return material ? `/math-tools?${new URLSearchParams({ ...material, from: lessonId })}` : null;
}
