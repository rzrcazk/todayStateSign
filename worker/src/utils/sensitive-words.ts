// 敏感词过滤工具
import type { Env } from '../types';

export async function checkSensitiveWords(
  content: string,
  db: D1Database
): Promise<{ hasSensitive: boolean; words: string[] }> {
  if (!content || content.trim() === '') {
    return { hasSensitive: false, words: [] };
  }

  const { results } = await db.prepare(
    'SELECT word FROM sensitive_words'
  ).all<{ word: string }>();

  const sensitiveWords = results.map(row => row.word);
  const foundWords: string[] = [];

  for (const word of sensitiveWords) {
    if (content.includes(word)) {
      foundWords.push(word);
    }
  }

  return {
    hasSensitive: foundWords.length > 0,
    words: foundWords,
  };
}

export function maskSensitiveContent(content: string): string {
  // 对敏感词进行脱敏处理
  const sensitivePattern = /[\u4e00-\u9fa5]/g;
  return content.replace(sensitivePattern, (char, index) => {
    // 只显示第一个和最后一个字符，中间用*代替
    return '*';
  });
}
