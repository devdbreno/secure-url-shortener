import { Test, TestingModule } from '@nestjs/testing';

import { URL_REPOSITORY } from '@application/constants';
import { ListUrlsUseCase } from '@application/use-cases/list-urls.usecase';
import { IUrlRepository } from '@domain/repositories/url.repository';

describe('ListUrlsUseCase', () => {
  let urlRepoMock: jest.Mocked<IUrlRepository>;
  let listUrlsUseCase: ListUrlsUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListUrlsUseCase,
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
    listUrlsUseCase = module.get(ListUrlsUseCase);
  });

  it('returns the urls for the user', async () => {
    const urls = [{ id: '1' }, { id: '2' }];

    urlRepoMock.listByUser.mockResolvedValueOnce(urls as never);

    await expect(listUrlsUseCase.execute('user-id')).resolves.toBe(urls as never);
  });
});
