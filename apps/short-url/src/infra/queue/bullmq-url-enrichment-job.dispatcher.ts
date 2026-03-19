import { Queue } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';

import {
  UrlEnrichmentJobPayload,
  IUrlEnrichmentJobDispatcher,
} from '@application/ports/outbound/url-enrichment-job-dispatcher.port';

import { URL_ENRICHMENT_JOB_NAME, URL_ENRICHMENT_QUEUE_NAME } from './url-enrichment-queue.constants';

@Injectable()
export class BullMqUrlEnrichmentJobDispatcher implements IUrlEnrichmentJobDispatcher {
  constructor(
    @InjectQueue(URL_ENRICHMENT_QUEUE_NAME)
    private readonly enrichmentQueue: Queue<UrlEnrichmentJobPayload>,
  ) {}

  public async dispatch(payload: UrlEnrichmentJobPayload): Promise<void> {
    await this.enrichmentQueue.add(URL_ENRICHMENT_JOB_NAME, payload, {
      delay: 5000,
      backoff: { type: 'exponential', delay: 5000 },
      attempts: 5,
      removeOnFail: 50,
      removeOnComplete: 100,
    });
  }
}
