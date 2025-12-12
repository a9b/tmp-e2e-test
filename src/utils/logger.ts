/**
 * ログ出力に関するユーティリティ
 */

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

class Logger {
  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatLog(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = this.formatTimestamp();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] ${message}${dataStr}`;
  }

  /**
   * 情報ログを出力
   */
  info(message: string, data?: unknown): void {
    console.log(this.formatLog(LogLevel.INFO, message, data));
  }

  /**
   * 警告ログを出力
   */
  warn(message: string, data?: unknown): void {
    console.warn(this.formatLog(LogLevel.WARN, message, data));
  }

  /**
   * エラーログを出力
   */
  error(message: string, data?: unknown): void {
    console.error(this.formatLog(LogLevel.ERROR, message, data));
  }

  /**
   * デバッグログを出力
   */
  debug(message: string, data?: unknown): void {
    console.debug(this.formatLog(LogLevel.DEBUG, message, data));
  }

  /**
   * アクション実行ログを出力
   */
  logAction(action: string, selector?: string, url?: string): void {
    this.info(`アクション実行: ${action}`, { selector, url });
  }

  /**
   * URL遷移ログを出力
   */
  logNavigation(from: string, to: string): void {
    this.info(`ページ遷移: ${from} → ${to}`);
  }

  /**
   * 待機ログを出力
   */
  logWait(durationMs: number): void {
    this.info(`待機: ${durationMs}ms`);
  }

  /**
   * ステップログを出力
   */
  logStep(step: number, total: number, action: string): void {
    this.info(`ステップ ${step}/${total}: ${action}`);
  }
}

export const logger = new Logger();


