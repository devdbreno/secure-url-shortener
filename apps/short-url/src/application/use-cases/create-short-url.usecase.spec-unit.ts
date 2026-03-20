import { Test, TestingModule } from '@nestjs/testing';

import { Url } from '@domain/entities/url.entity';
import { URL_ENRICHMENT_JOB_DISPATCHER, URL_REPOSITORY } from '@application/constants';
import { IUrlEnrichmentJobDispatcher } from '@application/ports/outbound/url-enrichment-job-dispatcher.port';
import { CreateShortUrlUseCase } from '@application/use-cases/create-short-url.usecase';
import { IUrlRepository } from '@domain/repositories/url.repository';

jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'abc12345',
}));

describe('CreateShortUrlUseCase', () => {
  let urlRepoMock: jest.Mocked<IUrlRepository>;
  let createShortUrlUseCase: CreateShortUrlUseCase;
  let enrichmentJobDispatcherMock: jest.Mocked<IUrlEnrichmentJobDispatcher>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateShortUrlUseCase,
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
        {
          provide: URL_ENRICHMENT_JOB_DISPATCHER,
          useValue: {
            dispatch: jest.fn(),
          },
        },
      ],
    }).compile();

    urlRepoMock = module.get(URL_REPOSITORY);
    enrichmentJobDispatcherMock = module.get(URL_ENRICHMENT_JOB_DISPATCHER);
    createShortUrlUseCase = module.get(CreateShortUrlUseCase);
  });

  it('creates a short url and dispatches enrichment through the application port', async () => {
    const createdUrl = new Url(
      'url-id',
      'https://example.test',
      0,
      'user-id',
      'abc12345',
      new Date(),
      new Date(),
      null,
      null,
    );

    urlRepoMock.findByCode.mockResolvedValueOnce(null);
    urlRepoMock.create.mockResolvedValueOnce(createdUrl);
    enrichmentJobDispatcherMock.dispatch.mockResolvedValueOnce();

    const result = await createShortUrlUseCase.execute(createdUrl.origin, createdUrl.userId);
    expect(result).toBe(createdUrl);
    expect(enrichmentJobDispatcherMock.dispatch.mock.calls).toHaveLength(1);
    expect(enrichmentJobDispatcherMock.dispatch.mock.calls[0][0]).toEqual({
      urlId: createdUrl.id,
      origin: createdUrl.origin,
    });
  });
});
