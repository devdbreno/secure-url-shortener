/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Repository } from 'typeorm';

import { UrlEnrichmentOrm } from '@infra/persistence/url-enrichment.orm.entity';
import { UrlOrm } from '@infra/persistence/url.orm.entity';
import { UrlRepository } from '@infra/persistence/url.repository';

type PendingEnrichment = Partial<UrlEnrichmentOrm> & { url: UrlOrm };

type MockQueryBuilder = {
  innerJoinAndSelect: jest.Mock<MockQueryBuilder, [string, string]>;
  where: jest.Mock<MockQueryBuilder, [string, { status: string }]>;
  andWhere: jest.Mock<MockQueryBuilder, [string]>;
  orderBy: jest.Mock<MockQueryBuilder, [string, 'ASC' | 'DESC']>;
  limit: jest.Mock<MockQueryBuilder, [number]>;
  setLock: jest.Mock<MockQueryBuilder, ['pessimistic_write']>;
  setOnLocked: jest.Mock<MockQueryBuilder, ['skip_locked']>;
  getMany: jest.Mock<Promise<PendingEnrichment[]>, []>;
};

type MockEnrichmentRepository = {
  createQueryBuilder: jest.Mock<MockQueryBuilder, [string]>;
  save: jest.Mock<Promise<PendingEnrichment[]>, [PendingEnrichment[]]>;
  update: jest.Mock<Promise<void>, [object, object]>;
};

type MockManager = {
  create: jest.Mock<UrlEnrichmentOrm, [typeof UrlEnrichmentOrm, Partial<UrlEnrichmentOrm>]>;
  getRepository: jest.Mock<MockEnrichmentRepository, [typeof UrlEnrichmentOrm]>;
  transaction: jest.Mock<Promise<UrlOrm[]>, [(manager: MockManager) => Promise<UrlOrm[]>]>;
};

type MockOrmRepository = jest.Mocked<Repository<UrlOrm>> & {
  manager: MockManager;
};

describe('UrlRepository', () => {
  const createRepository = () => {
    const queryBuilder: MockQueryBuilder = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      setOnLocked: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };
    const enrichmentRepository: MockEnrichmentRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      save: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const manager: MockManager = {
      create: jest.fn((_entity, data) => ({ ...data }) as UrlEnrichmentOrm),
      getRepository: jest.fn().mockReturnValue(enrichmentRepository),
      transaction: jest.fn(),
    };
    const ormRepository = {
      create: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn(),
      increment: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      manager,
    } as unknown as MockOrmRepository;

    return {
      ormRepository,
      manager,
      enrichmentRepository,
      queryBuilder,
      repository: new UrlRepository(ormRepository),
    };
  };

  it('creates a short url with a pending enrichment record', async () => {
    const { repository, ormRepository } = createRepository();
    const saved = {
      id: '1',
      origin: 'https://openai.com',
      clicks: 0,
      userId: 'user-id',
      code: 'abc12345',
      createdAt: new Date(),
      updatedAt: new Date(),
      enrichment: null,
    };

    ormRepository.create.mockReturnValueOnce(saved as never);
    ormRepository.save.mockResolvedValueOnce(saved as never);

    const result = await repository.create('https://openai.com', 'abc12345', 'user-id');

    expect(ormRepository.create.mock.calls).toEqual([
      [
        {
          origin: 'https://openai.com',
          code: 'abc12345',
          userId: 'user-id',
          enrichment: {
            status: 'pending',
            tags: [],
            attempts: 0,
          },
        },
      ],
    ]);
    expect(result).toMatchObject({
      id: '1',
      code: 'abc12345',
    });
  });

  it('updates the origin and recreates a pending enrichment state', async () => {
    const { repository, ormRepository, manager } = createRepository();
    const found = {
      id: '1',
      origin: 'https://old.com',
      clicks: 0,
      userId: 'user-id',
      code: 'abc12345',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      enrichment: null,
    };

    ormRepository.findOne.mockResolvedValueOnce(found as never);
    ormRepository.save.mockResolvedValueOnce({
      ...found,
      origin: 'https://new.com',
      enrichment: {
        id: 'enrichment-id',
        urlId: '1',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
        attempts: 0,
      },
    } as never);

    const result = await repository.updateOrigin('1', 'https://new.com', 'user-id', 'abc12345');

    expect(manager.create.mock.calls).toHaveLength(1);
    expect(result).toMatchObject({
      origin: 'https://new.com',
      code: 'abc12345',
    });
  });

  it('returns null when updateOrigin cannot find the url', async () => {
    const { repository, ormRepository } = createRepository();

    ormRepository.findOne.mockResolvedValueOnce(null);

    await expect(repository.updateOrigin('1', 'https://new.com', 'user-id', 'abc123')).resolves.toBeNull();
  });

  it('claims pending enrichments and marks them as processing', async () => {
    const { repository, manager, enrichmentRepository, queryBuilder } = createRepository();
    const pending: PendingEnrichment[] = [
      {
        error: 'old-error',
        status: 'pending',
        attempts: 0,
        url: {
          id: '1',
          origin: 'https://openai.com',
          clicks: 0,
          userId: 'user-id',
          code: 'abc12345',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: undefined,
          enrichment: null,
        },
      },
    ];

    queryBuilder.getMany.mockResolvedValueOnce(pending);
    manager.transaction.mockImplementationOnce((callback) => callback(manager));

    const result = await repository.claimPendingEnrichments(10);

    expect(enrichmentRepository.save.mock.calls).toEqual([
      [
        [
          expect.objectContaining({
            error: null,
            status: 'processing',
            attempts: 1,
          }),
        ],
      ],
    ]);
    expect(result[0]).toMatchObject({ id: '1', code: 'abc12345' });
  });

  it('returns an empty list when there are no pending enrichments', async () => {
    const { repository, manager, queryBuilder } = createRepository();

    queryBuilder.getMany.mockResolvedValueOnce([]);
    manager.transaction.mockImplementationOnce((callback) => callback(manager));

    await expect(repository.claimPendingEnrichments(10)).resolves.toEqual([]);
  });

  it('updates enrichment success and failure states', async () => {
    const { repository, manager, enrichmentRepository } = createRepository();

    await repository.completeEnrichment(
      '1',
      {
        summary: 'summary',
        category: 'docs',
        tags: ['ai'],
        alternativeSlug: 'openai',
        riskLevel: 'low',
      },
      2,
    );
    await repository.failEnrichment('1', 'error', 3);

    expect(enrichmentRepository.update.mock.calls[0]).toEqual([
      { urlId: '1' },
      expect.objectContaining({
        status: 'completed',
        attempts: 2,
        error: null,
      }),
    ]);
    expect(enrichmentRepository.update.mock.calls[1]).toEqual([
      { urlId: '1' },
      {
        error: 'error',
        status: 'failed',
        attempts: 3,
      },
    ]);
    expect(manager.getRepository.mock.calls).toHaveLength(2);
  });

  it('uses zero attempts when enrichment updates do not receive an attempts value', async () => {
    const { repository, enrichmentRepository } = createRepository();

    await repository.completeEnrichment('1', {
      summary: 'summary',
      category: 'docs',
      tags: [],
      alternativeSlug: 'openai',
      riskLevel: 'low',
    });
    await repository.failEnrichment('1', 'error');

    expect(enrichmentRepository.update.mock.calls[0]).toEqual([
      { urlId: '1' },
      expect.objectContaining({ attempts: 0 }),
    ]);
    expect(enrichmentRepository.update.mock.calls[1]).toEqual([
      { urlId: '1' },
      {
        error: 'error',
        status: 'failed',
        attempts: 0,
      },
    ]);
  });

  it('maps lookups by code, user id and humanized slug', async () => {
    const { repository, ormRepository } = createRepository();
    const found = {
      id: '1',
      origin: 'https://openai.com',
      clicks: 1,
      userId: 'user-id',
      code: 'abc12345',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      enrichment: {
        id: 'enrichment-id',
        urlId: '1',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
        summary: 'summary',
        category: 'docs',
        tags: ['ai'],
        alternativeSlug: 'openai',
        riskLevel: 'low',
        enrichedAt: new Date(),
        error: null,
        attempts: 1,
      },
    };

    ormRepository.findOne.mockResolvedValueOnce(found as never);
    ormRepository.findOne.mockResolvedValueOnce(found as never);
    ormRepository.findOne.mockResolvedValueOnce(found as never);
    ormRepository.find.mockResolvedValueOnce([found] as never);

    const byCode = await repository.findByCode('abc12345');
    const byUser = await repository.findByCodeAndUserId('abc12345', 'user-id');
    const byHumanized = await repository.findByAlternativeSlugAndUserId('openai', 'user-id');
    const userItems = await repository.listByUser('user-id');

    expect(byCode).not.toBeNull();
    expect(byCode?.id).toBe('1');
    expect(byCode?.enrichment?.status).toBe('completed');
    expect(byUser?.id).toBe('1');
    expect(byHumanized?.id).toBe('1');
    expect(userItems).toHaveLength(1);
  });

  it('returns null when the code lookup does not find a url', async () => {
    const { repository, ormRepository } = createRepository();

    ormRepository.findOne.mockResolvedValueOnce(null);

    await expect(repository.findByCode('missing01')).resolves.toBeNull();
  });

  it('returns null when the user scoped lookup does not find a url', async () => {
    const { repository, ormRepository } = createRepository();

    ormRepository.findOne.mockResolvedValueOnce(null);

    await expect(repository.findByCodeAndUserId('missing01', 'user-id')).resolves.toBeNull();
  });

  it('returns null when the humanized lookup does not find a url', async () => {
    const { repository, ormRepository } = createRepository();

    ormRepository.findOne.mockResolvedValueOnce(null);

    await expect(repository.findByAlternativeSlugAndUserId('missing-slug', 'user-id')).resolves.toBeNull();
  });

  it('maps null enrichment tags to an empty list', async () => {
    const { repository, ormRepository } = createRepository();
    const found = {
      id: '1',
      origin: 'https://openai.com',
      clicks: 1,
      userId: 'user-id',
      code: 'abc12345',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      enrichment: {
        id: 'enrichment-id',
        urlId: '1',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
        summary: 'summary',
        category: 'docs',
        tags: null,
        alternativeSlug: 'openai',
        riskLevel: 'low',
        enrichedAt: new Date(),
        error: null,
        attempts: 1,
      },
    };

    ormRepository.findOne.mockResolvedValueOnce(found as never);

    const result = await repository.findByCode('abc12345');

    expect(result?.enrichment?.tags).toEqual([]);
  });

  it('handles the simple write operations', async () => {
    const { repository, ormRepository } = createRepository();

    await repository.softDelete('1');
    await repository.incrementClicks('1');

    expect(ormRepository.softDelete.mock.calls).toEqual([[{ id: '1' }]]);
    expect(ormRepository.increment.mock.calls).toEqual([[{ id: '1' }, 'clicks', 1]]);
  });
});
