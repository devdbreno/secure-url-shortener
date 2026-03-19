import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { URL_REPOSITORY } from '@application/constants';
import { Url } from '@domain/entities/url.entity';
import { IUrlRepository } from '@domain/repositories/url.repository';

@Injectable()
export class GetShortUrlStatsUseCase {
  constructor(@Inject(URL_REPOSITORY) private readonly urlRepo: IUrlRepository) {}

  public async execute(userId: string, code: string): Promise<Url> {
    const shortUrl = await this.urlRepo.findByCodeAndUserId(code, userId);

    if (!shortUrl || shortUrl.deletedAt) {
      throw new NotFoundException('Shortened URL not found or inactive!');
    }

    return shortUrl;
  }
}
