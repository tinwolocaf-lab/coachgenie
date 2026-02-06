// Sanctuary insight helpers (no client-side AI calls)

export function detectInsightInMessage(
  message: string
): { hasInsight: boolean; insightContent?: string } {
  // Check for explicit insight markers
  const insightPatterns = [
    /💡\s*INSIGHT:\s*(.+?)(?=\n|$)/i,
    /\*\*INSIGHT\*\*:\s*(.+?)(?=\n|$)/i,
    /Key insight:\s*(.+?)(?=\n|$)/i,
  ];

  for (const pattern of insightPatterns) {
    const match = message.match(pattern);
    if (match) {
      return { hasInsight: true, insightContent: match[1].trim() };
    }
  }

  // Check for implicit insight language
  const implicitInsightPhrases = [
    'the real question is',
    "what i'm hearing is",
    'underneath this',
    'the breakthrough here',
    'this is significant',
    'notice how',
    'the pattern i see',
  ];

  const lowerMessage = message.toLowerCase();
  for (const phrase of implicitInsightPhrases) {
    if (lowerMessage.includes(phrase)) {
      const sentences = message.split(/[.!?]+/);
      const insightSentence = sentences.find((s) =>
        s.toLowerCase().includes(phrase)
      );
      if (insightSentence) {
        return { hasInsight: true, insightContent: insightSentence.trim() };
      }
    }
  }

  return { hasInsight: false };
}
