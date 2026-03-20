import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { Url } from '@domain/entities/url.entity';
import { URL_REPOSITORY } from '@application/constants';
import { IUrlRepository } from '@domain/repositories/url.repository';
import { GetShortUrlUseCase } from '@application/use-cases/get-short-url.usecase';

describe('GetShortUrlUseCase', () => {
  let urlRepoMock: jest.Mocked<IUrlRepository>;
  let getShortUrlUseCase: GetShortUrlUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetShortUrlUseCase,
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
    getShortUrlUseCase = module.get(GetShortUrlUseCase);
  });

  it('returns the user-owned url', async () => {
    const url = new Url('1', 'https://example.test', 8, 'user-id', 'abc12345', new Date(), new Date(), null, null);

    urlRepoMock.findByCode.mockResolvedValueOnce(url);

    await expect(getShortUrlUseCase.execute('abc12345', 'user-id')).resolves.toBe(url);
  });

  it('returns an anonymous url without authentication', async () => {
    const url = new Url('1', 'https://example.test', 8, null, 'abc12345', new Date(), new Date(), null, null);

    urlRepoMock.findByCode.mockResolvedValueOnce(url);

    await expect(getShortUrlUseCase.execute('abc12345')).resolves.toBe(url);
  });

  it('throws when the url belongs to another user', async () => {
    const url = new Url('1', 'https://example.test', 8, 'owner-id', 'abc12345', new Date(), new Date(), null, null);

    urlRepoMock.findByCode.mockResolvedValueOnce(url);

    await expect(getShortUrlUseCase.execute('abc12345', 'other-user')).rejects.toThrow(NotFoundException);
  });

  it('throws when the url is missing or inactive', async () => {
    urlRepoMock.findByCode.mockResolvedValueOnce(null);

    await expect(getShortUrlUseCase.execute('missing01', 'user-id')).rejects.toThrow(NotFoundException);
  });
});
