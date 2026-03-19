import type { Queue } from 'bullmq';

import { BullMqUrlEnrichmentJobDispatcher } from '@infra/queue/bullmq-url-enrichment-job.dispatcher';
import { URL_ENRICHMENT_JOB_NAME } from '@infra/queue/url-enrichment-queue.constants';

describe('BullMqUrlEnrichmentJobDispatcher', () => {
  it('enqueues the job with the configured retry policy', async () => {
    const queue = {
      add: jest.fn(),
    } as unknown as jest.Mocked<Queue<any>>;

    const dispatcher = new BullMqUrlEnrichmentJobDispatcher(queue);
    const payload = { urlId: 'url-id', origin: 'https://openai.com' };

    await dispatcher.dispatch(payload);

    expect(queue.add.mock.calls).toEqual([
      [
        URL_ENRICHMENT_JOB_NAME,
        payload,
        {
          delay: 5000,
          backoff: { type: 'exponential', delay: 5000 },
          attempts: 5,
          removeOnFail: 50,
          removeOnComplete: 100,
        },
      ],
    ]);
  });
});
