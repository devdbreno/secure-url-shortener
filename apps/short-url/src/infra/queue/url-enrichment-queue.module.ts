import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

import { URL_ENRICHMENT_JOB_DISPATCHER } from '@application/constants';

import { BullMqUrlEnrichmentJobDispatcher } from './bullmq-url-enrichment-job.dispatcher';
import { URL_ENRICHMENT_QUEUE_NAME } from './url-enrichment-queue.constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          password: config.get<string>('redis.password'),
        },
      }),
    }),
    BullModule.registerQueue({ name: URL_ENRICHMENT_QUEUE_NAME }),
  ],
  providers: [
    BullMqUrlEnrichmentJobDispatcher,
    {
      provide: URL_ENRICHMENT_JOB_DISPATCHER,
      useExisting: BullMqUrlEnrichmentJobDispatcher,
    },
  ],
  exports: [URL_ENRICHMENT_JOB_DISPATCHER],
})
export class UrlEnrichmentQueueModule {}
