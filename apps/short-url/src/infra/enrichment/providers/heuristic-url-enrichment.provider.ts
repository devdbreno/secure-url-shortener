import { Injectable } from '@nestjs/common';

import {
  UrlEnrichmentInput,
  UrlEnrichmentOutput,
  IUrlEnrichmentProvider,
} from '@application/ports/outbound/url-enrichment.provider';

@Injectable()
export class HeuristicUrlEnrichmentProvider implements IUrlEnrichmentProvider {
  public enrich(input: UrlEnrichmentInput): UrlEnrichmentOutput {
    const parsedUrl = new URL(input.origin);
    const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = parsedUrl.pathname === '/' ? '' : parsedUrl.pathname;

    const rawSlug = `${hostname}-${pathname}`;
    const alternativeSlug = rawSlug
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '-')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 120);

    const textToAnalyze =
      `${input.pageTitle || ''} ${input.pageDescription || ''} ${hostname} ${pathname}`.toLowerCase();

    // Simple Category
    let category = 'website';
    const matchers: Record<string, string[]> = {
      video: ['video', 'youtube', 'vimeo', 'watch'],
      news: ['news', 'article', 'blog', 'journal'],
      shopping: ['shop', 'store', 'buy', 'product'],
      documentation: ['docs', 'api', 'guide', 'reference'],
      education: ['learn', 'course', 'academy', 'tutorial'],
      social: ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok'],
    };

    for (const [cat, keywords] of Object.entries(matchers)) {
      if (keywords.some((k) => textToAnalyze.includes(k))) {
        category = cat;
        break;
      }
    }

    // Simple Summary
    const summaryParts = [input.pageTitle, input.pageDescription]
      .filter((v): v is string => Boolean(v))
      .map((v) => v.trim());
    const summary =
      summaryParts.length > 0
        ? summaryParts.join(' - ').slice(0, 280)
        : `Content from ${hostname} categorized as ${category}.`.slice(0, 280);

    // Simple Tags
    const stopwords = new Set([
      'https',
      'http',
      'www',
      'com',
      'page',
      'with',
      'from',
      'this',
      'that',
      'para',
      'como',
      'your',
    ]);
    const rawWords = textToAnalyze
      .replace(/[./:]+/g, ' ')
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .split(/[\s-]+/)
      .filter((w) => w.length >= 4 && !stopwords.has(w));

    const tags = Array.from(new Set([category, ...hostname.split('.'), ...rawWords]))
      .filter((tag) => tag !== 'www')
      .slice(0, 5);

    return {
      tags,
      summary,
      category,
      riskLevel: 'low',
      alternativeSlug,
      provider: 'heuristic',
    };
  }
}
