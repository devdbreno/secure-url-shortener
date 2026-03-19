import { Inject } from '@nestjs/common';
import { Injectable, NotFoundException } from '@nestjs/common';

import { URL_REPOSITORY } from '@application/constants';
import { IUrlRepository } from '@domain/repositories/url.repository';
import { UpdateShortUrlOriginDTO } from '@presentation/dto/update-short-url-origin.dto';

@Injectable()
export class UpdateShortUrlOriginUseCase {
  constructor(@Inject(URL_REPOSITORY) private readonly urlRepo: IUrlRepository) {}

  public async execute(userId: string, code: string, updateShortUrlOriginDTO: UpdateShortUrlOriginDTO) {
    const shortUrl = await this.urlRepo.findByCodeAndUserId(code, userId);

    if (!shortUrl || shortUrl.deletedAt) {
      throw new NotFoundException('Shortened URL not found or inactive!');
    }

    shortUrl.origin = updateShortUrlOriginDTO.origin;

    const shortUrlUpdated = await this.urlRepo.updateOrigin(shortUrl.id, shortUrl.origin, userId, code);

    return shortUrlUpdated;
  }
}
