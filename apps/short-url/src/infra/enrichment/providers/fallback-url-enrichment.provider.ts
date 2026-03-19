import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';

import {
  UrlEnrichmentInput,
  UrlEnrichmentOutput,
  IUrlEnrichmentProvider,
} from '@application/ports/outbound/url-enrichment.provider';
import { GeminiUrlEnrichmentProvider } from './gemini-url-enrichment.provider';
import { HeuristicUrlEnrichmentProvider } from './heuristic-url-enrichment.provider';

@Injectable()
export class FallbackUrlEnrichmentProvider implements IUrlEnrichmentProvider {
  private readonly logger = new Logger(FallbackUrlEnrichmentProvider.name);

  constructor(
    private readonly config: ConfigService,
    private readonly geminiProvider: GeminiUrlEnrichmentProvider,
    private readonly heuristicProvider: HeuristicUrlEnrichmentProvider,
  ) {}

  public async enrich(input: UrlEnrichmentInput): Promise<UrlEnrichmentOutput> {
    const isAiEnabled = this.config.get<boolean>('api.aiEnrichmentEnabled');

    if (isAiEnabled) {
      try {
        return await this.geminiProvider.enrich(input);
      } catch (error) {
        this.logger.warn(`AI Provider failed, falling back to heuristic: ${(error as Error).message}`);
      }
    }

    return this.heuristicProvider.enrich(input);
  }
}
