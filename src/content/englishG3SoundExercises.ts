import exercises from './englishG3SoundExercises.json' with { type: 'json' };

/** Original pictured items and choices, checked against P6/18/30/42/54/66 and their Listen and circle recordings. */
export type EnglishSoundQuestion = { word: string; choices: string[]; answer: string; picture: string; page: number; region: number[] };
export const ENGLISH_G3_SOUND_EXERCISES: Record<string, EnglishSoundQuestion[]> = exercises;
