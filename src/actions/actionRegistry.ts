import { Page } from 'playwright';
import { Action, PageActionSet, ActionResult } from './actionTypes';
import { logger } from '../utils/logger';

/**
 * 基本的なクリックアクションを生成
 */
function createClickAction(
  name: string,
  selectors: string[],
  description?: string
): Action {
  return {
    name,
    selectors,
    description,
    execute: async (page: Page, selector: string): Promise<ActionResult> => {
      try {
        logger.logAction(name, selector);
        
        // 要素が存在するか確認
        const element = await page.locator(selector).first();
        const isVisible = await element.isVisible().catch(() => false);
        
        if (!isVisible) {
          logger.warn(`要素が見つかりません: ${selector}`);
          return {
            success: false,
            message: `要素が見つかりません: ${selector}`,
          };
        }

        // クリック実行
        await element.click({ timeout: 5000 });
        
        // ページ遷移を待機
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
          // ネットワークアイドルを待てない場合は無視
        });

        const currentUrl = page.url();
        logger.logNavigation(selector, currentUrl);

        return {
          success: true,
          message: `${name}をクリックしました`,
          url: currentUrl,
        };
      } catch (error) {
        logger.error(`アクション実行エラー: ${name}`, error);
        return {
          success: false,
          message: `エラー: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
  };
}

/**
 * MONROE（モンロー）船橋店を探してクリックするアクション
 */
const findMonroeAction: Action = {
  name: 'MONROE（モンロー）船橋店を探す',
  selectors: [
    'text=MONROE（モンロー） 船橋店',
    'text=MONROE 船橋店',
    'text=モンロー 船橋店',
    'a:has-text("MONROE")',
    'a:has-text("モンロー")',
  ],
  description: 'MONROE（モンロー）船橋店のリンクを探してクリック',
  required: true,
  execute: async (page: Page, selector: string): Promise<ActionResult> => {
    try {
      logger.logAction('MONROE（モンロー）船橋店を探す', selector);
      
      // まずページが完全に読み込まれるまで待機
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000); // 追加の待機時間
      
      // テキストで検索（部分一致も含む）
      const searchPatterns = [
        'MONROE（モンロー） 船橋店',
        'MONROE 船橋店',
        'モンロー 船橋店',
        'MONROE（モンロー）',
        'MONROE',
        'モンロー',
      ];
      
      let found = false;
      let clickedElement = null;
      
      // パターン1: テキストセレクタで検索
      for (const pattern of searchPatterns) {
        try {
          const element = page.locator(`text=${pattern}`).first();
          const count = await element.count();
          if (count > 0) {
            const isVisible = await element.isVisible({ timeout: 3000 }).catch(() => false);
            if (isVisible) {
              await element.scrollIntoViewIfNeeded();
              await element.click({ timeout: 5000 });
              clickedElement = element;
              found = true;
              logger.info(`テキストセレクタで発見: ${pattern}`);
              break;
            }
          }
        } catch {
          // 次のパターンを試す
        }
      }

      // パターン2: リンクタグで検索（部分一致）
      if (!found) {
        try {
          const linkElements = await page.locator('a').all();
          logger.debug(`リンク要素数: ${linkElements.length}`);
          
          for (const link of linkElements) {
            try {
              const text = await link.textContent().catch(() => '');
              const href = await link.getAttribute('href').catch(() => '');
              
              if (text) {
                const normalizedText = text.trim();
                if (
                  normalizedText.includes('MONROE') ||
                  normalizedText.includes('モンロー') ||
                  normalizedText.includes('monroe')
                ) {
                  const isVisible = await link.isVisible({ timeout: 2000 }).catch(() => false);
                  if (isVisible) {
                    await link.scrollIntoViewIfNeeded();
                    await link.click({ timeout: 5000 });
                    clickedElement = link;
                    found = true;
                    logger.info(`リンクテキストで発見: ${normalizedText}`);
                    break;
                  }
                }
              }
              
              // href属性でも検索
              if (href && (href.includes('monroe') || href.includes('MONROE'))) {
                const isVisible = await link.isVisible({ timeout: 2000 }).catch(() => false);
                if (isVisible) {
                  await link.scrollIntoViewIfNeeded();
                  await link.click({ timeout: 5000 });
                  clickedElement = link;
                  found = true;
                  logger.info(`リンクURLで発見: ${href}`);
                  break;
                }
              }
            } catch {
              // 次のリンクを試す
            }
          }
        } catch (error) {
          logger.warn('リンク検索中にエラー', error);
        }
      }

      // パターン3: より広範囲な検索（h2, h3, divなど）
      if (!found) {
        try {
          const allElements = await page.locator('h2, h3, div, span, a').all();
          for (const element of allElements) {
            try {
              const text = await element.textContent().catch(() => '');
              if (text && (text.includes('MONROE') || text.includes('モンロー'))) {
                const isVisible = await element.isVisible({ timeout: 2000 }).catch(() => false);
                if (isVisible) {
                  // 親要素のリンクを探す
                  const parentLink = await element.locator('..').locator('a').first();
                  const linkCount = await parentLink.count();
                  if (linkCount > 0) {
                    await parentLink.scrollIntoViewIfNeeded();
                    await parentLink.click({ timeout: 5000 });
                    clickedElement = parentLink;
                    found = true;
                    logger.info(`親要素のリンクで発見: ${text.substring(0, 50)}`);
                    break;
                  }
                }
              }
            } catch {
              // 次の要素を試す
            }
          }
        } catch (error) {
          logger.warn('広範囲検索中にエラー', error);
        }
      }

      if (!found) {
        logger.warn('MONROE（モンロー）船橋店が見つかりませんでした');
        // デバッグ用: ページのテキストを一部取得
        try {
          const bodyText = await page.locator('body').textContent();
          const monroeIndex = bodyText?.toLowerCase().indexOf('monroe') ?? -1;
          if (monroeIndex >= 0) {
            const snippet = bodyText?.substring(Math.max(0, monroeIndex - 50), monroeIndex + 50);
            logger.debug('MONROEを含むテキストスニペット', { snippet });
          }
        } catch {
          // 無視
        }
        return {
          success: false,
          message: 'MONROE（モンロー）船橋店が見つかりませんでした',
        };
      }

      // ページ遷移を待機
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000); // 追加の待機時間

      const currentUrl = page.url();
      logger.logNavigation('MONROE（モンロー）船橋店', currentUrl);

      return {
        success: true,
        message: 'MONROE（モンロー）船橋店をクリックしました',
        url: currentUrl,
      };
    } catch (error) {
      logger.error('MONROE（モンロー）船橋店の検索エラー', error);
      return {
        success: false,
        message: `エラー: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

/**
 * 店舗詳細ページのアクション定義
 * 別ファイルで管理しやすくするため、配列として定義
 */
export const monroeShopActions: Action[] = [
  createClickAction(
    '店舗トップ',
    [
      'a:has-text("店舗トップ")',
      'text=店舗トップ',
      '[href*="top"]',
    ],
    '店舗トップページに遷移'
  ),
  createClickAction(
    'ニュース セラピスト',
    [
      'a:has-text("ニュース セラピスト")',
      'text=ニュース セラピスト',
      '[href*="news"]',
      '[href*="therapist"]',
    ],
    'ニュース セラピストページに遷移'
  ),
  createClickAction(
    'セラピスト動画',
    [
      'a:has-text("セラピスト動画")',
      'text=セラピスト動画',
      '[href*="video"]',
      '[href*="movie"]',
    ],
    'セラピスト動画ページに遷移'
  ),
  createClickAction(
    '料金システム',
    [
      'a:has-text("料金システム")',
      'text=料金システム',
      '[href*="price"]',
      '[href*="fee"]',
    ],
    '料金システムページに遷移'
  ),
  createClickAction(
    'アクセス',
    [
      'a:has-text("アクセス")',
      'text=アクセス',
      '[href*="access"]',
    ],
    'アクセスページに遷移'
  ),
  createClickAction(
    '割引情報',
    [
      'a:has-text("割引情報")',
      'text=割引情報',
      '[href*="discount"]',
      '[href*="coupon"]',
    ],
    '割引情報ページに遷移'
  ),
  createClickAction(
    'ネット予約',
    [
      'a:has-text("ネット予約")',
      'text=ネット予約',
      '[href*="reserve"]',
      '[href*="booking"]',
      'button:has-text("予約")',
    ],
    'ネット予約ページに遷移'
  ),
];

/**
 * ページ種別ごとのアクションセットを定義
 */
export const pageActionSets: PageActionSet[] = [
  {
    identifier: /funabashi/,
    description: '船橋・西船橋エリアの総合エステランキングページ',
    actions: [findMonroeAction],
  },
  {
    identifier: /shop-detail/,
    description: '店舗詳細ページ（MONROE（モンロー）船橋店を含む）',
    actions: monroeShopActions,
  },
  {
    identifier: /monroe|モンロー/i,
    description: 'MONROE（モンロー）船橋店の詳細ページ（フォールバック）',
    actions: monroeShopActions,
  },
];

/**
 * 現在のページに適用可能なアクションセットを取得
 */
export function getActionsForPage(url: string, pageTitle?: string): Action[] {
  const allActions: Action[] = [];
  const actionNames = new Set<string>(); // 重複を避けるため
  
  logger.debug('アクション取得中', { url, pageTitle });
  
  // より具体的なパターンから順にマッチング（店舗詳細ページを優先）
  const sortedActionSets = [...pageActionSets].sort((a, b) => {
    // shop-detailを最優先
    if (a.identifier.toString().includes('shop-detail')) return -1;
    if (b.identifier.toString().includes('shop-detail')) return 1;
    // monroeを次に優先
    if (a.identifier.toString().includes('monroe')) return -1;
    if (b.identifier.toString().includes('monroe')) return 1;
    return 0;
  });
  
  for (const actionSet of sortedActionSets) {
    let matched = false;
    
    if (typeof actionSet.identifier === 'string') {
      matched = url.includes(actionSet.identifier) || (pageTitle?.includes(actionSet.identifier) ?? false);
    } else if (actionSet.identifier instanceof RegExp) {
      matched = actionSet.identifier.test(url) || (pageTitle ? actionSet.identifier.test(pageTitle) : false);
    }
    
    if (matched) {
      logger.debug('アクションセットが一致', { 
        description: actionSet.description,
        actionCount: actionSet.actions.length 
      });
      
      // 店舗詳細ページの場合は、findMonroeActionを除外
      const isShopDetailPage = url.includes('shop-detail');
      for (const action of actionSet.actions) {
        // 店舗詳細ページでは「MONROE（モンロー）船橋店を探す」を除外
        if (isShopDetailPage && action.name === 'MONROE（モンロー）船橋店を探す') {
          continue;
        }
        // 重複を避ける
        if (!actionNames.has(action.name)) {
          allActions.push(action);
          actionNames.add(action.name);
        }
      }
    }
  }
  
  logger.debug('取得したアクション数', { count: allActions.length, actionNames: allActions.map(a => a.name) });
  
  return allActions;
}

/**
 * アクションを実行可能かチェック
 */
export async function isActionExecutable(
  page: Page,
  action: Action
): Promise<boolean> {
  for (const selector of action.selectors) {
    try {
      const element = page.locator(selector).first();
      const isVisible = await element.isVisible({ timeout: 2000 }).catch(() => false);
      if (isVisible) {
        return true;
      }
    } catch {
      // 次のセレクタを試す
    }
  }
  return false;
}

