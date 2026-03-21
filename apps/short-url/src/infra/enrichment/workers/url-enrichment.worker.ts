import { Job } from 'bullmq';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { URL_ENRICHMENT_PROVIDER, URL_REPOSITORY } from '@application/constants';
import { UrlEnrichmentJobPayload } from '@application/ports/outbound/url-enrichment-job-dispatcher.port';
import { IUrlEnrichmentProvider } from '@application/ports/outbound/url-enrichment.provider';
import { IUrlRepository } from '@domain/repositories/url.repository';
import { URL_ENRICHMENT_QUEUE_NAME } from '@infra/queue/url-enrichment-queue.constants';

import { UrlPageContentFetcherService } from '../services/url-page-content-fetcher.service';

@Processor(URL_ENRICHMENT_QUEUE_NAME)
@Injectable()
export class UrlEnrichmentWorker extends WorkerHost {
  private readonly logger = new Logger(UrlEnrichmentWorker.name);

  constructor(
    private readonly pageContentFetcher: UrlPageContentFetcherService,
    @Inject(URL_REPOSITORY) private readonly urlRepo: IUrlRepository,
    @Inject(URL_ENRICHMENT_PROVIDER) private readonly enrichmentProvider: IUrlEnrichmentProvider,
  ) {
    super();
  }

  public async process(job: Job<UrlEnrichmentJobPayload>) {
    const { urlId, origin } = job.data;

    try {
      this.logger.log(`Processing enrichment for URL ${urlId} (${origin})`);

      const page = await this.pageContentFetcher.fetch(origin);

      const enrichment = await this.enrichmentProvider.enrich({
        origin: origin,
        pageTitle: page.title,
        pageDescription: page.description,
        pageContent: page.content,
      });

      await this.urlRepo.completeEnrichment(urlId, enrichment, job.attemptsStarted);

      this.logger.log(`Successfully enriched URL ${urlId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown enrichment error.';

      await this.urlRepo.failEnrichment(urlId, message, job.attemptsStarted);

      this.logger.warn(`Failed to enrich URL ${urlId}: ${message}`);

      throw error;
    }
  }
}
