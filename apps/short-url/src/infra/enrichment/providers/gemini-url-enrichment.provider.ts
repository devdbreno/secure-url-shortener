import { GoogleGenAI } from '@google/genai';
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';

import {
  UrlEnrichmentInput,
  UrlEnrichmentOutput,
  IUrlEnrichmentProvider,
} from '@application/ports/outbound/url-enrichment.provider';

@Injectable()
export class GeminiUrlEnrichmentProvider implements IUrlEnrichmentProvider {
  private readonly logger = new Logger(GeminiUrlEnrichmentProvider.name);

  private readonly ai: GoogleGenAI;
  private readonly model: string;
  private readonly maxChars: number;

  constructor(private readonly config: ConfigService) {
    this.ai = new GoogleGenAI({ apiKey: this.config.get<string>('gemini.apiKey') });
    this.model = this.config.get<string>('gemini.model');
    this.maxChars = this.config.get<number>('api.aiPageMaxChars');
  }

  public async enrich(input: UrlEnrichmentInput): Promise<UrlEnrichmentOutput> {
    const prompt = `
Act as a web analyzer. Return ONLY a JSON object matching this schema:
{
  "summary": "string (max 280 chars)",
  "category": "news|social|video|shopping|documentation|education|finance|productivity|website",
  "tags": "string[] (max 5, lowercase)",
  "alternativeSlug": "url-friendly-slug",
  "riskLevel": "low|medium|high"
}

Data:
- URL: ${input.origin}
- Title: ${input.pageTitle || ''}
- Desc: ${input.pageDescription || ''}
- Content: ${(input.pageContent || '').slice(0, this.maxChars)}`.trim();

    const response = await this.ai.models.generateContent({
      model: this.model,
      config: { responseMimeType: 'application/json' },
      contents: prompt,
    });

    try {
      const result = JSON.parse(response.text) as UrlEnrichmentOutput;

      return {
        tags: Array.isArray(result.tags) ? result.tags : [],
        summary: result.summary || 'Summary unavailable',
        category: result.category || 'website',
        riskLevel: ['low', 'medium', 'high'].includes(result.riskLevel) ? result.riskLevel : 'low',
        alternativeSlug: result.alternativeSlug || 'link',
        provider: 'gemini',
      };
    } catch (e) {
      this.logger.error('Failed to parse Gemini response', e);

      throw e;
    }
  }
}
