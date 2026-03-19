import { Impit } from 'impit';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { IUrlPageContentFetcher, UrlPageContent } from '@application/ports/outbound/url-page-content-fetcher.port';

type FetchResponseLike = {
  ok: boolean;
  status: number;
  headers: Headers;
  text(): Promise<string>;
};

@Injectable()
export class UrlPageContentFetcherService implements IUrlPageContentFetcher {
  private readonly logger = new Logger(UrlPageContentFetcherService.name);

  private readonly impit: Impit;
  private readonly maxChars: number;
  private readonly fetchTimeout: number;

  constructor(private readonly configService: ConfigService) {
    this.maxChars = this.configService.get<number>('api.aiPageMaxChars');
    this.fetchTimeout = this.configService.get<number>('api.aiPageFetchTimeoutMs');
    this.impit = new Impit({
      browser: 'chrome',
      timeout: this.fetchTimeout,
      followRedirects: true,
      vanillaFallback: false,
    });
  }

  public async fetch(origin: string): Promise<UrlPageContent> {
    const parsed = new URL(origin);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Origin protocol is not supported for enrichment.');
    }

    if (this.isUnsafeHostname(parsed.hostname)) {
      throw new Error('Origin host is not eligible for server-side enrichment.');
    }

    const requestUrl = this.toRequestUrl(parsed);
    const response = await this.tryPageFetch(requestUrl);

    if (response?.ok) {
      return this.toPageContent(response, parsed);
    }

    this.logger.warn(`Falling back to minimal page metadata for ${origin}.`);

    return this.createFallbackContent(parsed);
  }

  private async tryPageFetch(origin: string): Promise<FetchResponseLike | null> {
    try {
      const response = await this.impit.fetch(origin, {
        method: 'GET',
        timeout: this.fetchTimeout,
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'secure-url-shortener-bot/1.0',
        },
      });

      if (!response.ok) {
        this.logger.warn(`Page fetch returned ${response.status} for ${origin}.`);
      }

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown page fetch error.';

      this.logger.warn(`Page fetch failed for ${origin}: ${message}`);

      return null;
    }
  }

  private async toPageContent(response: FetchResponseLike, parsed: URL): Promise<UrlPageContent> {
    const contentType = response.headers.get('content-type') ?? '';

    if (!contentType.includes('text/html')) {
      this.logger.warn(`Origin returned ${contentType} for ${parsed.href}, expected text/html.`);

      return this.createFallbackContent(parsed);
    }

    const html = await response.text();

    return {
      title: this.extractTag(html, 'title'),
      content: this.stripHtml(html).slice(0, this.maxChars),
      description: this.extractMetaDescription(html),
    };
  }

  private createFallbackContent(parsed: URL): UrlPageContent {
    return {
      title: parsed.hostname,
      content: `${parsed.hostname} ${parsed.pathname}`.trim(),
      description: null,
    };
  }

  private toRequestUrl(parsed: URL) {
    return `${parsed.origin}${parsed.pathname}${parsed.search}`;
  }

  private stripHtml(html: string) {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractTag(html: string, tag: string) {
    const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(html);

    return match?.[1]?.replace(/\s+/g, ' ').trim() ?? null;
  }

  private extractMetaDescription(html: string) {
    const match = /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i.exec(html);

    return match?.[1]?.trim() ?? null;
  }

  private isUnsafeHostname(hostname: string) {
    const normalized = hostname.trim().toLowerCase();

    return (
      normalized === 'localhost' ||
      normalized.endsWith('.local') ||
      /^127\./.test(normalized) ||
      /^10\./.test(normalized) ||
      /^192\.168\./.test(normalized) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized) ||
      normalized === '0.0.0.0'
    );
  }
}
