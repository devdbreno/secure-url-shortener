import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { URL_REPOSITORY } from '@application/constants';
import { RedirectShortUrlUseCase } from '@application/use-cases/redirect-short-url.usecase';
import { Url } from '@domain/entities/url.entity';
import { IUrlRepository } from '@domain/repositories/url.repository';

describe('RedirectShortUrlUseCase', () => {
  let urlRepoMock: jest.Mocked<IUrlRepository>;
  let redirectShortUrlUseCase: RedirectShortUrlUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedirectShortUrlUseCase,
        {
          provide: URL_REPOSITORY,
          useValue: {
            create: jest.fn(),
            softDelete: jest.fn(),
            listByUser: jest.fn(),
            updateOrigin: jest.fn(),
            incrementClicks: jest.fn(),
            failEnrichment: jest.fn(),
            findByCode: jest.fn(),
            completeEnrichment: jest.fn(),
            claimPendingEnrichments: jest.fn(),
            findByCodeAndUserId: jest.fn(),
            findByAlternativeSlugAndUserId: jest.fn(),
          },
        },
      ],
    }).compile();

    urlRepoMock = module.get(URL_REPOSITORY);
    redirectShortUrlUseCase = module.get(RedirectShortUrlUseCase);
  });

  it('returns the url when the short code exists', async () => {
    const url = new Url('1', 'https://openai.com', 0, 'user-id', 'abc12345', new Date(), new Date(), null, null);

    urlRepoMock.findByCode.mockResolvedValueOnce(url);

    await expect(redirectShortUrlUseCase.execute('abc12345')).resolves.toBe(url);
  });

  it('throws when the url is missing or deleted', async () => {
    urlRepoMock.findByCode.mockResolvedValueOnce(null);

    await expect(redirectShortUrlUseCase.execute('missing')).rejects.toThrow(NotFoundException);
  });

  it('returns the url when the humanized lookup exists', async () => {
    const url = new Url('1', 'https://openai.com', 0, 'user-id', 'abc12345', new Date(), new Date(), null, null);

    urlRepoMock.findByAlternativeSlugAndUserId.mockResolvedValueOnce(url);

    await expect(redirectShortUrlUseCase.executeHumanized('user-id', 'OpenAI-Docs')).resolves.toBe(url);
    expect(urlRepoMock.findByAlternativeSlugAndUserId).toHaveBeenCalledWith('openai-docs', 'user-id');
  });

  it('throws when the humanized lookup is missing', async () => {
    urlRepoMock.findByAlternativeSlugAndUserId.mockResolvedValueOnce(null);

    await expect(redirectShortUrlUseCase.executeHumanized('user-id', 'missing-slug')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('tracks a visit by incrementing clicks', async () => {
    await redirectShortUrlUseCase.trackVisit('url-id');

    expect(urlRepoMock.incrementClicks.mock.calls).toEqual([['url-id']]);
  });
});
