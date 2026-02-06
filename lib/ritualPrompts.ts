import { ContextVault, GrowthChapter, MORNING_PROMPTS } from '@/types';

export function getMorningPrompt(
  userContext: ContextVault | null,
  activeChapter: GrowthChapter | null
): string {
  if (activeChapter) {
    const chapterPrompts = [
      `As you work toward "${activeChapter.title}", what's the one thing that would move you forward today?`,
      `Thinking about your vision for "${activeChapter.title}", what intention will guide your actions today?`,
      `What small step toward "${activeChapter.title}" would make today meaningful?`,
    ];
    return chapterPrompts[Math.floor(Math.random() * chapterPrompts.length)];
  }

  if (userContext && userContext.values.length > 0) {
    const value = userContext.values[Math.floor(Math.random() * userContext.values.length)];
    return `As someone who values ${value}, what is the one thing that would make today a success?`;
  }

  return MORNING_PROMPTS[Math.floor(Math.random() * MORNING_PROMPTS.length)];
}
