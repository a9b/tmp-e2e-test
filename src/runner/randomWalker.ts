import { Page } from 'playwright';
import { Action, ActionResult } from '../actions/actionTypes';
import { getActionsForPage, isActionExecutable } from '../actions/actionRegistry';
import { randomChoice, shuffle, randomWaitTime } from '../utils/random';
import { logger } from '../utils/logger';
import { BrowserLauncher } from '../browser/launcher';

export interface WalkerConfig {
  /** 最大ステップ数 */
  maxSteps?: number;
  /** 最小待機時間（ミリ秒） */
  minWaitTime?: number;
  /** 最大待機時間（ミリ秒） */
  maxWaitTime?: number;
  /** ランダム順序で実行するか */
  randomOrder?: boolean;
  /** 訪問済みURLの最大数 */
  maxVisitedUrls?: number;
  /** スクリーンショット保存ディレクトリ */
  screenshotDir?: string;
}

const DEFAULT_CONFIG: Required<WalkerConfig> = {
  maxSteps: 50,
  minWaitTime: 1000,
  maxWaitTime: 3000,
  randomOrder: true,
  maxVisitedUrls: 20,
  screenshotDir: './screenshots',
};

export class RandomWalker {
  private config: Required<WalkerConfig>;
  private visitedUrls: Set<string> = new Set();
  private stepCount: number = 0;
  private launcher: BrowserLauncher;

  constructor(launcher: BrowserLauncher, config: WalkerConfig = {}) {
    this.launcher = launcher;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 回遊を開始
   */
  async walk(startUrl: string): Promise<void> {
    try {
      logger.info('回遊を開始します', {
        startUrl,
        maxSteps: this.config.maxSteps,
        randomOrder: this.config.randomOrder,
      });

      // 初期URLに遷移
      await this.launcher.navigate(startUrl);
      this.visitedUrls.add(startUrl);
      this.stepCount = 0;

      // 回遊ループ
      while (this.stepCount < this.config.maxSteps) {
        const page = this.launcher.getPage();
        const currentUrl = page.url();
        const pageTitle = await page.title().catch(() => '');

        logger.logStep(this.stepCount + 1, this.config.maxSteps, currentUrl);

        // 現在のページで実行可能なアクションを取得
        const availableActions = getActionsForPage(currentUrl, pageTitle);
        logger.debug('利用可能なアクション', { 
          count: availableActions.length,
          names: availableActions.map(a => a.name)
        });
        
        if (availableActions.length === 0) {
          logger.warn('実行可能なアクションが見つかりません', { url: currentUrl });
          break;
        }

        // 実行可能なアクションをフィルタリング
        const executableActions: Action[] = [];
        for (const action of availableActions) {
          const executable = await isActionExecutable(page, action);
          if (executable) {
            executableActions.push(action);
          }
        }

        if (executableActions.length === 0) {
          logger.warn('実行可能なアクションがありません', { url: currentUrl });
          break;
        }

        // アクションを選択
        const selectedAction = this.selectAction(executableActions);
        if (!selectedAction) {
          logger.warn('アクションの選択に失敗しました');
          break;
        }

        // 実行可能なセレクタを選択
        const selector = await this.selectSelector(page, selectedAction);
        if (!selector) {
          logger.warn(`アクション「${selectedAction.name}」のセレクタが見つかりません`);
          this.stepCount++;
          continue;
        }

        // 待機時間を設定
        const waitTime = randomWaitTime(this.config.minWaitTime, this.config.maxWaitTime);
        logger.logWait(waitTime);
        await this.wait(waitTime);

        // アクションを実行
        const result = await selectedAction.execute(page, selector);
        
        if (result.success) {
          this.stepCount++;
          
          // URLが変更された場合、訪問済みURLに追加
          if (result.url && result.url !== currentUrl) {
            // 訪問済みURLの上限チェック
            if (this.visitedUrls.size >= this.config.maxVisitedUrls) {
              logger.info('訪問済みURLの上限に達しました');
              break;
            }
            
            // 同じURLを再度訪問しないようにチェック（オプション）
            // コメントアウトすることで同じURLを複数回訪問可能
            // if (this.visitedUrls.has(result.url)) {
            //   logger.debug('既に訪問済みのURLです', { url: result.url });
            //   continue;
            // }
            
            this.visitedUrls.add(result.url);
          }
        } else {
          logger.warn(`アクション実行失敗: ${selectedAction.name}`, { message: result.message });
          this.stepCount++;
        }

        // エラー時のスクリーンショット保存（将来の拡張用）
        if (!result.success && this.config.screenshotDir) {
          // 必要に応じて実装
        }
      }

      logger.info('回遊が完了しました', {
        totalSteps: this.stepCount,
        visitedUrls: this.visitedUrls.size,
      });
    } catch (error) {
      logger.error('回遊中にエラーが発生しました', error);
      
      // エラー時のスクリーンショット保存
      if (this.config.screenshotDir) {
        try {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const screenshotPath = `${this.config.screenshotDir}/error-${timestamp}.png`;
          await this.launcher.takeScreenshot(screenshotPath);
        } catch (screenshotError) {
          logger.error('スクリーンショットの保存に失敗しました', screenshotError);
        }
      }
      
      throw error;
    }
  }

  /**
   * アクションを選択（ランダムまたは順序順）
   */
  private selectAction(actions: Action[]): Action | null {
    if (actions.length === 0) {
      return null;
    }

    // 必須アクションを優先
    const requiredActions = actions.filter(a => a.required);
    if (requiredActions.length > 0) {
      return this.config.randomOrder
        ? randomChoice(requiredActions)
        : requiredActions[0];
    }

    // ランダム順序の場合はシャッフル
    const actionsToUse = this.config.randomOrder ? shuffle([...actions]) : actions;
    return actionsToUse[0];
  }

  /**
   * 実行可能なセレクタを選択
   */
  private async selectSelector(page: Page, action: Action): Promise<string | null> {
    for (const selector of action.selectors) {
      try {
        const element = page.locator(selector).first();
        const isVisible = await element.isVisible({ timeout: 2000 }).catch(() => false);
        if (isVisible) {
          return selector;
        }
      } catch {
        // 次のセレクタを試す
      }
    }
    return null;
  }

  /**
   * 待機
   */
  private async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 訪問済みURLの一覧を取得
   */
  getVisitedUrls(): string[] {
    return Array.from(this.visitedUrls);
  }

  /**
   * 現在のステップ数を取得
   */
  getStepCount(): number {
    return this.stepCount;
  }
}

