import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { URL_REPOSITORY } from '@application/constants';
import { SoftDeleteShortUrlUseCase } from '@application/use-cases/soft-delete-short-url.usecase';
import { Url } from '@domain/entities/url.entity';
import { IUrlRepository } from '@domain/repositories/url.repository';

describe('SoftDeleteShortUrlUseCase', () => {
  let urlRepoMock: jest.Mocked<IUrlRepository>;
  let softDeleteShortUrlUseCase: SoftDeleteShortUrlUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SoftDeleteShortUrlUseCase,
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
    softDeleteShortUrlUseCase = module.get(SoftDeleteShortUrlUseCase);
  });

  it('soft deletes the url when it belongs to the user', async () => {
    const url = new Url('1', 'https://example.test', 0, 'user-id', 'abc12345', new Date(), new Date(), null, null);

    urlRepoMock.findByCodeAndUserId.mockResolvedValueOnce(url);

    await softDeleteShortUrlUseCase.execute('user-id', 'abc12345');

    expect(urlRepoMock.softDelete.mock.calls).toEqual([[url.id]]);
  });

  it('throws when the url is not found', async () => {
    urlRepoMock.findByCodeAndUserId.mockResolvedValueOnce(null);

    await expect(softDeleteShortUrlUseCase.execute('user-id', 'missing')).rejects.toThrow(NotFoundException);
  });
});
