import { Inject } from '@nestjs/common';
import { Injectable, NotFoundException } from '@nestjs/common';

import { URL_REPOSITORY } from '../constants';
import { IUrlRepository } from '../../domain/repositories/url.repository';

@Injectable()
export class SoftDeleteShortUrlUseCase {
  constructor(@Inject(URL_REPOSITORY) private readonly urlRepo: IUrlRepository) {}

  async execute(userId: string, code: string): Promise<void> {
    const shortUrl = await this.urlRepo.findByCodeAndUserId(code, userId);

    if (!shortUrl || shortUrl.deletedAt) {
      throw new NotFoundException('Shortened URL not found or already deleted.');
    }

    await this.urlRepo.softDelete(shortUrl.id);
  }
}
