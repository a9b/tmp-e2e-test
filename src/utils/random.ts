/**
 * ランダム処理に関するユーティリティ関数
 */

/**
 * 指定された範囲内のランダムな整数を生成
 * @param min 最小値（含む）
 * @param max 最大値（含む）
 * @returns ランダムな整数
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 指定された範囲内のランダムな待機時間（ミリ秒）を生成
 * @param minMs 最小待機時間（ミリ秒）
 * @param maxMs 最大待機時間（ミリ秒）
 * @returns ランダムな待機時間（ミリ秒）
 */
export function randomWaitTime(minMs: number, maxMs: number): number {
  return randomInt(minMs, maxMs);
}

/**
 * 配列からランダムに1つの要素を選択
 * @param array 選択対象の配列
 * @returns ランダムに選択された要素
 */
export function randomChoice<T>(array: T[]): T {
  if (array.length === 0) {
    throw new Error('配列が空です');
  }
  return array[randomInt(0, array.length - 1)];
}

/**
 * 配列をランダムにシャッフル
 * @param array シャッフル対象の配列
 * @returns シャッフルされた新しい配列
 */
export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}


