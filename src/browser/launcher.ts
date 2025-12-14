import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { logger } from '../utils/logger';
import { loadProxyConfig, loadProxyRotationConfig, getNextProxyUrl, validateProxyUrl, ProxyConfig, ProxyRotationConfig } from './proxyConfig';

export interface BrowserConfig {
  headless?: boolean;
  viewport?: {
    width: number;
    height: number;
  };
  userAgent?: string;
  timeout?: number;
  /** プロキシ設定（オプション） */
  proxy?: {
    server: string;
  };
}

const DEFAULT_CONFIG: Required<Omit<BrowserConfig, 'proxy'>> & { proxy?: BrowserConfig['proxy'] } = {
  headless: false,
  viewport: {
    width: 1920,
    height: 1080,
  },
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  timeout: 60000, // デフォルトタイムアウトを60秒に延長（プロキシ使用時を考慮）
};

export class BrowserLauncher {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: Required<Omit<BrowserConfig, 'proxy'>> & { proxy?: BrowserConfig['proxy'] };
  private proxyConfig: ProxyConfig | null = null;
  private proxyRotationConfig: ProxyRotationConfig | null = null;

  constructor(config: BrowserConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // 環境変数からプロキシ設定を読み込む
    this.proxyConfig = loadProxyConfig();
    this.proxyRotationConfig = loadProxyRotationConfig();
    
    // プロキシ設定がある場合、configに反映
    if (this.proxyConfig && this.proxyConfig.enabled) {
      if (validateProxyUrl(this.proxyConfig.url)) {
        // Playwrightのプロキシ設定形式
        // iproyalなどの場合、URLをそのまま使用
        this.config.proxy = { server: this.proxyConfig.url };
        logger.info('プロキシ設定を読み込みました', { 
          proxyUrl: this.maskProxyUrl(this.proxyConfig.url) 
        });
      } else {
        logger.warn('プロキシURLの形式が不正です', { proxyUrl: this.maskProxyUrl(this.proxyConfig.url) });
      }
    } else if (this.proxyRotationConfig) {
      // ローテーション設定がある場合
      const nextUrl = getNextProxyUrl(this.proxyRotationConfig);
      if (validateProxyUrl(nextUrl)) {
        this.config.proxy = { server: nextUrl };
        logger.info('プロキシローテーション設定を読み込みました', { 
          proxyCount: this.proxyRotationConfig.urls.length,
          method: this.proxyRotationConfig.method,
          currentProxy: this.maskProxyUrl(nextUrl)
        });
      }
    }
  }
  
  /**
   * プロキシURLをマスク（ログ出力用）
   */
  private maskProxyUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const username = urlObj.username;
      const password = urlObj.password;
      if (username || password) {
        // 認証情報をマスク
        return url.replace(/\/\/[^@]+@/, '//***:***@');
      }
      return url;
    } catch {
      return '***';
    }
  }
  
  /**
   * プロキシローテーション設定があるか確認
   */
  hasProxyRotationConfig(): boolean {
    return this.proxyRotationConfig !== null;
  }
  
  /**
   * プロキシをローテーション（次のプロキシに切り替え）
   */
  rotateProxy(): void {
    if (!this.proxyRotationConfig) {
      // 警告は出さない（呼び出し側で処理する）
      return;
    }
    
    const nextUrl = getNextProxyUrl(this.proxyRotationConfig);
    if (validateProxyUrl(nextUrl)) {
      this.config.proxy = { server: nextUrl };
      logger.info('プロキシをローテーションしました', { 
        proxyUrl: this.maskProxyUrl(nextUrl) 
      });
    }
  }
  
  /**
   * 新しいブラウザコンテキストを作成（プロキシを切り替えた場合に使用）
   */
  async createNewContext(): Promise<void> {
    if (!this.browser) {
      throw new Error('ブラウザが起動していません。launch()を先に呼び出してください。');
    }
    
    // 既存のコンテキストを閉じる
    if (this.context) {
      await this.context.close().catch(() => {});
    }
    
    // 新しいコンテキストを作成
    const contextOptions: any = {
      viewport: this.config.viewport,
      userAgent: this.config.userAgent,
    };
    
    // プロキシ設定を適用（認証情報を分離）
    if (this.config.proxy) {
      try {
        const proxyUrl = new URL(this.config.proxy.server);
        const username = proxyUrl.username;
        const password = proxyUrl.password;
        
        if (username && password) {
          const host = proxyUrl.hostname;
          const port = proxyUrl.port || (proxyUrl.protocol === 'https:' ? '443' : '80');
          
          contextOptions.proxy = {
            server: `${proxyUrl.protocol}//${host}:${port}`,
            username: decodeURIComponent(username),
            password: decodeURIComponent(password),
          };
          logger.debug('プロキシを使用して新しいブラウザコンテキストを作成します（認証情報を分離）', {
            proxyServer: `${proxyUrl.protocol}//${host}:${port}`
          });
        } else {
          contextOptions.proxy = this.config.proxy;
          logger.debug('プロキシを使用して新しいブラウザコンテキストを作成します');
        }
      } catch (error) {
        logger.debug('プロキシURLの解析に失敗しました。そのまま使用します', error);
        contextOptions.proxy = this.config.proxy;
      }
    }
    
    this.context = await this.browser.newContext(contextOptions);
    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(this.config.timeout);
    
    // 新しいコンテキストが完全に準備できるまで少し待機
    await this.page.waitForTimeout(500);
    
    logger.info('新しいブラウザコンテキストを作成しました');
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

      // コンテキスト作成時のオプション
      const contextOptions: any = {
        viewport: this.config.viewport,
        userAgent: this.config.userAgent,
      };
      
      // プロキシ設定がある場合は追加
      if (this.config.proxy) {
        // Playwrightのプロキシ設定形式
        // URLに認証情報が含まれている場合は、そのまま使用
        // 認証情報を個別に指定する場合は、URLから抽出して設定
        try {
          const proxyUrl = new URL(this.config.proxy.server);
          const username = proxyUrl.username;
          const password = proxyUrl.password;
          
          if (username && password) {
            // 認証情報がURLに含まれている場合、分離して設定
            // hostとportを正しく取得
            const host = proxyUrl.hostname;
            const port = proxyUrl.port || (proxyUrl.protocol === 'https:' ? '443' : '80');
            
            contextOptions.proxy = {
              server: `${proxyUrl.protocol}//${host}:${port}`,
              username: decodeURIComponent(username),
              password: decodeURIComponent(password),
            };
            logger.debug('プロキシを使用してブラウザコンテキストを作成します（認証情報を分離）', {
              proxyServer: `${proxyUrl.protocol}//${host}:${port}`
            });
          } else {
            // 認証情報がURLに含まれていない場合、そのまま使用
            contextOptions.proxy = this.config.proxy;
            logger.debug('プロキシを使用してブラウザコンテキストを作成します');
          }
        } catch (error) {
          // URL解析に失敗した場合、そのまま使用
          logger.debug('プロキシURLの解析に失敗しました。そのまま使用します', error);
          contextOptions.proxy = this.config.proxy;
        }
      }

      this.context = await this.browser.newContext(contextOptions);

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
      
      // プロキシ使用時はタイムアウトを延長し、待機条件を緩和
      const timeout = this.config.proxy ? 60000 : 30000; // プロキシ使用時は60秒
      const waitUntil = this.config.proxy ? 'domcontentloaded' : 'networkidle'; // プロキシ使用時はdomcontentloaded
      
      await this.page.goto(url, { 
        waitUntil: waitUntil as any,
        timeout: timeout 
      });
      
      // プロキシ使用時は追加で少し待機（ネットワークリクエストの完了を待つ）
      if (this.config.proxy) {
        try {
          await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
            // networkidleを待てない場合は無視（domcontentloadedで十分）
          });
        } catch {
          // 無視
        }
      }
      
      logger.info('ページの読み込みが完了しました');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`URL遷移に失敗しました: ${url}`, { 
        error: errorMessage,
        proxy: this.config.proxy ? this.maskProxyUrl(this.config.proxy.server) : 'なし'
      });
      
      // プロキシエラーの場合、より詳細な情報を出力
      if (errorMessage.includes('proxy') || errorMessage.includes('timeout') || errorMessage.includes('net::')) {
        logger.warn('プロキシ接続に問題がある可能性があります。プロキシ設定を確認してください。');
        
        // タイムアウトエラーの場合、リトライを試みる
        if (errorMessage.includes('Timeout')) {
          logger.info('タイムアウトが発生しました。リトライを試みます...');
          try {
            await this.page.goto(url, { 
              waitUntil: 'domcontentloaded' as any,
              timeout: 60000 
            });
            logger.info('リトライが成功しました');
            return;
          } catch (retryError) {
            logger.error('リトライも失敗しました', retryError);
          }
        }
      }
      
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


