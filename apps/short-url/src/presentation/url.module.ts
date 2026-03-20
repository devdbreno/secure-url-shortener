import { Module } from '@nestjs/common';

import { UrlOrm } from '@infra/persistence/url.orm.entity';
import { UrlRepository } from '@infra/persistence/url.repository';
import { UrlController } from '@presentation/controllers/url.controller';
import { URL_REPOSITORY } from '@application/constants';
import { ListUrlsUseCase } from '@application/use-cases/list-urls.usecase';
import { EnrichmentModule } from '@infra/enrichment/enrichment.module';
import { UrlEnrichmentOrm } from '@infra/persistence/url-enrichment.orm.entity';
import { HealthController } from '@presentation/controllers/health.controller';
import { PersistenceModule } from '@infra/persistence/persistence.module';
import { GetShortUrlUseCase } from '@application/use-cases/get-short-url.usecase';
import { IdentityClientModule } from '@infra/clients/identity/identity-client.module';
import { CreateShortUrlUseCase } from '@application/use-cases/create-short-url.usecase';
import { GetShortUrlStatsUseCase } from '@application/use-cases/get-short-url-stats.usecase';
import { RedirectShortUrlUseCase } from '@application/use-cases/redirect-short-url.usecase';
import { UrlEnrichmentQueueModule } from '@infra/queue/url-enrichment-queue.module';
import { SoftDeleteShortUrlUseCase } from '@application/use-cases/soft-delete-short-url.usecase';
import { UpdateShortUrlOriginUseCase } from '@application/use-cases/update-short-url-origin.usecase';

@Module({
  imports: [
    IdentityClientModule,
    EnrichmentModule,
    UrlEnrichmentQueueModule,
    PersistenceModule.forFeature([UrlOrm, UrlEnrichmentOrm], [{ provide: URL_REPOSITORY, useClass: UrlRepository }]),
  ],
  providers: [
    ListUrlsUseCase,
    GetShortUrlUseCase,
    CreateShortUrlUseCase,
    GetShortUrlStatsUseCase,
    RedirectShortUrlUseCase,
    SoftDeleteShortUrlUseCase,
    UpdateShortUrlOriginUseCase,
  ],
  controllers: [UrlController, HealthController],
})
export class UrlModule {}
