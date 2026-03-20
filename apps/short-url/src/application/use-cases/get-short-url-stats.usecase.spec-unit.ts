import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { URL_REPOSITORY } from '@application/constants';
import { GetShortUrlStatsUseCase } from '@application/use-cases/get-short-url-stats.usecase';
import { Url } from '@domain/entities/url.entity';
import { IUrlRepository } from '@domain/repositories/url.repository';

describe('GetShortUrlStatsUseCase', () => {
  let urlRepoMock: jest.Mocked<IUrlRepository>;
  let getShortUrlStatsUseCase: GetShortUrlStatsUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetShortUrlStatsUseCase,
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
    getShortUrlStatsUseCase = module.get(GetShortUrlStatsUseCase);
  });

  it('returns the user-owned url for stats', async () => {
    const url = new Url('1', 'https://example.test', 8, 'user-id', 'abc12345', new Date(), new Date(), null, null);

    urlRepoMock.findByCodeAndUserId.mockResolvedValueOnce(url);

    await expect(getShortUrlStatsUseCase.execute('user-id', 'abc12345')).resolves.toBe(url);
  });

  it('throws when the url is missing or inactive', async () => {
    urlRepoMock.findByCodeAndUserId.mockResolvedValueOnce(null);

    await expect(getShortUrlStatsUseCase.execute('user-id', 'missing01')).rejects.toThrow(NotFoundException);
  });
});
