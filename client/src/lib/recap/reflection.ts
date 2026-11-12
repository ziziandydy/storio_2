import type { RecapData, ReflectionCandidate, ReflectionScene } from './types';

/** 依索引取心得候選；越界退回第一則；沒有候選回 null。預覽與 2B 的輸出共用，確保所見即輸出所得。 */
export function reflectionCandidate(data: ReflectionScene | null, index = 0): ReflectionCandidate | null {
  const list = data?.candidates ?? [];
  if (list.length === 0) return null;
  return list[index] ?? list[0];
}

export function reflectionText(recap: RecapData, index = 0): string | null {
  return reflectionCandidate(recap.reflection, index)?.text ?? null;
}
