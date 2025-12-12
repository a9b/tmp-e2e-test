import { BrowserLauncher } from './browser/launcher';
import { RandomWalker } from './runner/randomWalker';
import { logger } from './utils/logger';

/**
 * メイン実行関数
 */
async function main() {
  const startUrl = 'https://www.esthe-ranking.jp/funabashi/';
  
  // 環境変数から設定を読み込み
  const headless = process.env.HEADLESS === 'true';
  const maxSteps = parseInt(process.env.MAX_STEPS || '50', 10);
  const minWaitTime = parseInt(process.env.MIN_WAIT_TIME || '1000', 10);
  const maxWaitTime = parseInt(process.env.MAX_WAIT_TIME || '3000', 10);
  const randomOrder = process.env.RANDOM_ORDER !== 'false';

  logger.info('=== E2E回遊テスト開始 ===');
  logger.info('設定', {
    headless,
    maxSteps,
    minWaitTime,
    maxWaitTime,
    randomOrder,
  });

  const launcher = new BrowserLauncher({
    headless,
    viewport: {
      width: 1920,
      height: 1080,
    },
  });

  const walker = new RandomWalker(launcher, {
    maxSteps,
    minWaitTime,
    maxWaitTime,
    randomOrder,
    maxVisitedUrls: 20,
    screenshotDir: './screenshots',
  });

  try {
    // ブラウザを起動
    await launcher.launch();

    // 回遊を開始
    await walker.walk(startUrl);

    logger.info('=== 回遊テスト完了 ===');
    logger.info('訪問したURL数', { count: walker.getVisitedUrls().length });
    logger.info('実行ステップ数', { count: walker.getStepCount() });
  } catch (error) {
    logger.error('実行中にエラーが発生しました', error);
    process.exit(1);
  } finally {
    // ブラウザを閉じる
    await launcher.close();
  }
}

// エントリーポイント
if (require.main === module) {
  main().catch(error => {
    logger.error('予期しないエラーが発生しました', error);
    process.exit(1);
  });
}

export { main };


