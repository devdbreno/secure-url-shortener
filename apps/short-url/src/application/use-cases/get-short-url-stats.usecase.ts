import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { URL_REPOSITORY } from '@application/constants';
import { Url } from '@domain/entities/url.entity';
import { IUrlRepository } from '@domain/repositories/url.repository';

@Injectable()
export class GetShortUrlStatsUseCase {
  constructor(@Inject(URL_REPOSITORY) private readonly urlRepo: IUrlRepository) {}

  public async execute(code: string, userId?: string | null): Promise<Url> {
    const shortUrl = await this.urlRepo.findByCode(code);

    if (!shortUrl || shortUrl.deletedAt || (shortUrl.userId && shortUrl.userId !== userId)) {
      throw new NotFoundException('Shortened URL not found or inactive!');
    }

    return shortUrl;
  }
}
