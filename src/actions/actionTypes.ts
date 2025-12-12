import { Page } from 'playwright';

/**
 * アクションの実行結果
 */
export interface ActionResult {
  success: boolean;
  message?: string;
  url?: string;
}

/**
 * アクションの型定義
 */
export interface Action {
  /** アクション名 */
  name: string;
  /** セレクタ（複数指定可能） */
  selectors: string[];
  /** アクション実行関数 */
  execute: (page: Page, selector: string) => Promise<ActionResult>;
  /** アクションの説明 */
  description?: string;
  /** このアクションが必須かどうか */
  required?: boolean;
}

/**
 * ページ種別に応じたアクションセット
 */
export interface PageActionSet {
  /** ページを識別するURLパターンまたはセレクタ */
  identifier: string | RegExp;
  /** このページで実行可能なアクション一覧 */
  actions: Action[];
  /** ページの説明 */
  description?: string;
}


