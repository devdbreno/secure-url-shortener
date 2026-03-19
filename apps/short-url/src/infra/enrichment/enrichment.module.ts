import { Module } from '@nestjs/common';

import { URL_ENRICHMENT_PROVIDER, URL_REPOSITORY } from '@application/constants';
import { PersistenceModule } from '@infra/persistence/persistence.module';
import { UrlEnrichmentOrm } from '@infra/persistence/url-enrichment.orm.entity';
import { UrlOrm } from '@infra/persistence/url.orm.entity';
import { UrlRepository } from '@infra/persistence/url.repository';
import { UrlEnrichmentQueueModule } from '@infra/queue/url-enrichment-queue.module';

import { FallbackUrlEnrichmentProvider } from './providers/fallback-url-enrichment.provider';
import { GeminiUrlEnrichmentProvider } from './providers/gemini-url-enrichment.provider';
import { HeuristicUrlEnrichmentProvider } from './providers/heuristic-url-enrichment.provider';
import { UrlPageContentFetcherService } from './services/url-page-content-fetcher.service';
import { UrlEnrichmentWorker } from './workers/url-enrichment.worker';

@Module({
  imports: [
    PersistenceModule.forFeature([UrlOrm, UrlEnrichmentOrm], [{ provide: URL_REPOSITORY, useClass: UrlRepository }]),
    UrlEnrichmentQueueModule,
  ],
  providers: [
    UrlEnrichmentWorker,
    GeminiUrlEnrichmentProvider,
    UrlPageContentFetcherService,
    HeuristicUrlEnrichmentProvider,
    {
      provide: URL_ENRICHMENT_PROVIDER,
      useClass: FallbackUrlEnrichmentProvider,
    },
  ],
})
export class EnrichmentModule {}
