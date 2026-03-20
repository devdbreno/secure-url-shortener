import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { URL_REPOSITORY } from '@application/constants';
import { UpdateShortUrlOriginUseCase } from '@application/use-cases/update-short-url-origin.usecase';
import { Url } from '@domain/entities/url.entity';
import { IUrlRepository } from '@domain/repositories/url.repository';

describe('UpdateShortUrlOriginUseCase', () => {
  let urlRepoMock: jest.Mocked<IUrlRepository>;
  let updateShortUrlOriginUseCase: UpdateShortUrlOriginUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateShortUrlOriginUseCase,
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
    updateShortUrlOriginUseCase = module.get(UpdateShortUrlOriginUseCase);
  });

  it('updates the origin and returns the updated url', async () => {
    const url = new Url('1', 'https://example.test', 0, 'user-id', 'abc12345', new Date(), new Date(), null, null);
    const updated = new Url(
      '1',
      'https://portal.example.test',
      0,
      'user-id',
      'abc12345',
      new Date(),
      new Date(),
      null,
      null,
    );

    urlRepoMock.findByCodeAndUserId.mockResolvedValueOnce(url);
    urlRepoMock.updateOrigin.mockResolvedValueOnce(updated);

    await expect(
      updateShortUrlOriginUseCase.execute('user-id', 'abc12345', {
        origin: updated.origin,
      } as never),
    ).resolves.toBe(updated);

    expect(urlRepoMock.updateOrigin.mock.calls).toEqual([[url.id, updated.origin, 'user-id', 'abc12345']]);
  });

  it('throws when the url is missing or inactive', async () => {
    urlRepoMock.findByCodeAndUserId.mockResolvedValueOnce(null);

    await expect(
      updateShortUrlOriginUseCase.execute('user-id', 'missing', {
        origin: 'https://portal.example.test',
      } as never),
    ).rejects.toThrow(NotFoundException);
  });
});
