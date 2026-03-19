import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { URL_REPOSITORY } from '../constants';

import { Url } from '../../domain/entities/url.entity';
import { IUrlRepository } from '../../domain/repositories/url.repository';

@Injectable()
export class RedirectShortUrlUseCase {
  constructor(@Inject(URL_REPOSITORY) private readonly urlRepo: IUrlRepository) {}

  public async execute(code: string): Promise<Url | null> {
    const url = await this.urlRepo.findByCode(code);

    if (!url || url.deletedAt) {
      throw new NotFoundException('Shortened URL not found or inactive!');
    }

    return url;
  }

  public async executeHumanized(userId: string, alternativeSlug: string): Promise<Url | null> {
    const url = await this.urlRepo.findByAlternativeSlugAndUserId(alternativeSlug.trim().toLowerCase(), userId);

    if (!url || url.deletedAt) {
      throw new NotFoundException('Shortened URL not found or inactive!');
    }

    return url;
  }

  public async trackVisit(id: string): Promise<void> {
    await this.urlRepo.incrementClicks(id);
  }
}
