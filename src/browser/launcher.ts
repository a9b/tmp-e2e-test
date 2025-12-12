import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { logger } from '../utils/logger';

export interface BrowserConfig {
  headless?: boolean;
  viewport?: {
    width: number;
    height: number;
  };
  userAgent?: string;
  timeout?: number;
}

const DEFAULT_CONFIG: Required<BrowserConfig> = {
  headless: false,
  viewport: {
    width: 1920,
    height: 1080,
  },
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  timeout: 30000,
};

export class BrowserLauncher {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: Required<BrowserConfig>;

  constructor(config: BrowserConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * ブラウザを起動
   */
  async launch(): Promise<void> {
    try {
      logger.info('ブラウザを起動中...', { headless: this.config.headless });
      
      this.browser = await chromium.launch({
        headless: this.config.headless,
        channel: 'chrome',
      });

      this.context = await this.browser.newContext({
        viewport: this.config.viewport,
        userAgent: this.config.userAgent,
      });

      this.page = await this.context.newPage();
      this.page.setDefaultTimeout(this.config.timeout);

      logger.info('ブラウザの起動が完了しました');
    } catch (error) {
      logger.error('ブラウザの起動に失敗しました', error);
      throw error;
    }
  }

  /**
   * ページインスタンスを取得
   */
  getPage(): Page {
    if (!this.page) {
      throw new Error('ブラウザが起動していません。launch()を先に呼び出してください。');
    }
    return this.page;
  }

  /**
   * 指定されたURLに遷移
   */
  async navigate(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('ブラウザが起動していません。launch()を先に呼び出してください。');
    }

    try {
      logger.info(`URLに遷移中: ${url}`);
      await this.page.goto(url, { waitUntil: 'networkidle' });
      logger.info('ページの読み込みが完了しました');
    } catch (error) {
      logger.error(`URL遷移に失敗しました: ${url}`, error);
      throw error;
    }
  }

  /**
   * スクリーンショットを保存
   */
  async takeScreenshot(filePath: string): Promise<void> {
    if (!this.page) {
      throw new Error('ブラウザが起動していません。launch()を先に呼び出してください。');
    }

    try {
      await this.page.screenshot({ path: filePath, fullPage: true });
      logger.info(`スクリーンショットを保存しました: ${filePath}`);
    } catch (error) {
      logger.error(`スクリーンショットの保存に失敗しました: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * ブラウザを閉じる
   */
  async close(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.context = null;
        this.page = null;
        logger.info('ブラウザを閉じました');
      }
    } catch (error) {
      logger.error('ブラウザの終了に失敗しました', error);
      throw error;
    }
  }

  /**
   * 現在のURLを取得
   */
  getCurrentUrl(): string {
    if (!this.page) {
      throw new Error('ブラウザが起動していません。launch()を先に呼び出してください。');
    }
    return this.page.url();
  }
}


