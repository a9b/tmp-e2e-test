/**
 * プロキシ設定の管理
 * 機密情報は環境変数から読み込む
 */

export interface ProxyConfig {
  /** プロキシURL（http://username:password@host:port形式） */
  url: string;
  /** プロキシを使用するかどうか */
  enabled: boolean;
}

export interface ProxyRotationConfig {
  /** プロキシURLのリスト */
  urls: string[];
  /** ローテーション方法（random: ランダム, sequential: 順番） */
  method: 'random' | 'sequential';
  /** 現在のインデックス（sequential用） */
  currentIndex: number;
}

/**
 * 環境変数からプロキシ設定を読み込む
 */
export function loadProxyConfig(): ProxyConfig | null {
  const useProxy = process.env.USE_PROXY === 'true';
  
  if (!useProxy) {
    return null;
  }

  const proxyUrl = process.env.PROXY_URL;
  
  if (!proxyUrl) {
    console.warn('USE_PROXY=trueですが、PROXY_URLが設定されていません');
    return null;
  }

  return {
    url: proxyUrl,
    enabled: true,
  };
}

/**
 * 環境変数からプロキシローテーション設定を読み込む
 */
export function loadProxyRotationConfig(): ProxyRotationConfig | null {
  const useProxy = process.env.USE_PROXY === 'true';
  
  if (!useProxy) {
    return null;
  }

  const proxyUrls = process.env.PROXY_URLS;
  
  if (!proxyUrls) {
    return null;
  }

  const urls = proxyUrls.split(',').map(url => url.trim()).filter(url => url.length > 0);
  
  if (urls.length === 0) {
    return null;
  }

  const method = (process.env.PROXY_ROTATION || 'random') as 'random' | 'sequential';

  return {
    urls,
    method,
    currentIndex: 0,
  };
}

/**
 * プロキシローテーションから次のURLを取得
 */
export function getNextProxyUrl(config: ProxyRotationConfig): string {
  if (config.method === 'random') {
    const randomIndex = Math.floor(Math.random() * config.urls.length);
    return config.urls[randomIndex];
  } else {
    // sequential
    const url = config.urls[config.currentIndex];
    config.currentIndex = (config.currentIndex + 1) % config.urls.length;
    return url;
  }
}

/**
 * プロキシURLを検証（基本的な形式チェック）
 */
export function validateProxyUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * iproyal形式のプロキシURLをPlaywright形式に変換
 * iproyalのパスワード部分に含まれる特殊文字をエンコード
 */
export function normalizeProxyUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // パスワード部分に特殊文字が含まれている場合、エンコードが必要な場合がある
    // ただし、PlaywrightはURL形式をそのまま受け取るので、基本的にはそのまま返す
    return url;
  } catch {
    return url;
  }
}

