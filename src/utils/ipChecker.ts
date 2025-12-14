/**
 * IPアドレス確認ユーティリティ
 * ブラウザの遷移を妨げないように、HTTPリクエストでIPを確認
 */

import { Page, BrowserContext } from 'playwright';
import { logger } from './logger';

/**
 * 現在のIPアドレスを取得（ページ遷移なし）
 * @param page ページインスタンス（コンテキスト取得用）
 */
export async function getCurrentIP(page: Page): Promise<string | null> {
  try {
    logger.debug('IPアドレスを確認中...');
    
    // ブラウザコンテキストを取得（プロキシ設定が適用されている）
    const context = page.context();
    
    // 複数のIP確認サービスを試す（HTTPリクエストで取得）
    const ipServices = [
      'https://api.ipify.org?format=text',
      'https://icanhazip.com',
      'https://ifconfig.me/ip',
    ];
    
    for (const serviceUrl of ipServices) {
      try {
        // ブラウザコンテキストのrequest APIを使用してHTTPリクエストを送信
        // これにより、プロキシ設定が適用され、ブラウザのページ遷移を妨げずにIPを確認できる
        const response = await context.request.get(serviceUrl, {
          timeout: 10000,
        });
        
        if (response.ok()) {
          const ip = await response.text();
          if (ip && ip.trim()) {
            const cleanIP = ip.trim();
            logger.info(`[IP確認] 現在のIPアドレス: ${cleanIP}`, { service: serviceUrl });
            return cleanIP;
          }
        }
      } catch (error) {
        logger.debug(`IP確認サービス ${serviceUrl} に失敗`, error);
        // 次のサービスを試す
        continue;
      }
    }
    
    logger.warn('IPアドレスの取得に失敗しました');
    return null;
  } catch (error) {
    logger.error('IPアドレス確認中にエラーが発生しました', error);
    return null;
  }
}

/**
 * IPアドレスの変更を確認
 */
export async function checkIPChange(
  page: Page,
  previousIP: string | null
): Promise<{ changed: boolean; currentIP: string | null }> {
  const currentIP = await getCurrentIP(page);
  
  if (!previousIP) {
    return { changed: false, currentIP };
  }
  
  if (!currentIP) {
    return { changed: false, currentIP: null };
  }
  
  const changed = previousIP !== currentIP;
  
  if (changed) {
    logger.info(`[IP変更] ${previousIP} → ${currentIP}`);
  } else {
    logger.debug(`[IP確認] IPアドレスは変更されていません: ${currentIP}`);
  }
  
  return { changed, currentIP };
}

