import { customAlphabet } from 'nanoid';
import { Inject, Injectable } from '@nestjs/common';

import { IUrlRepository } from '@domain/repositories/url.repository';

import { IUrlEnrichmentJobDispatcher } from '@application/ports/outbound/url-enrichment-job-dispatcher.port';
import { URL_ENRICHMENT_JOB_DISPATCHER, URL_REPOSITORY } from '@application/constants';

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', 8);

@Injectable()
export class CreateShortUrlUseCase {
  constructor(
    @Inject(URL_REPOSITORY) private readonly urlRepo: IUrlRepository,
    @Inject(URL_ENRICHMENT_JOB_DISPATCHER)
    private readonly enrichmentJobDispatcher: IUrlEnrichmentJobDispatcher,
  ) {}

  public async execute(origin: string, userId?: string | null) {
    const code = await this.generateUniqueCode();

    const result = await this.urlRepo.create(origin, code, userId);

    await this.enrichmentJobDispatcher.dispatch({
      urlId: result.id,
      origin: result.origin,
    });

    return result;
  }

  private async generateUniqueCode(): Promise<string> {
    let exists = true;
    let code: string;

    while (exists) {
      code = nanoid();

      const existing = await this.urlRepo.findByCode(code);

      exists = !!existing;
    }

    return code;
  }
}
