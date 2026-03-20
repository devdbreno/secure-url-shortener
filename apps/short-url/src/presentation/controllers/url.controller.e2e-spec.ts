import request from 'supertest';
import { Test } from '@nestjs/testing';
import type { FastifyRequest } from 'fastify';
import type { ExecutionContext } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'abc12345',
}));

import { ResultExceptionFilter } from '@infra/filters/result-exception.filter';
import { IdentityJwtTcpGuard } from '@infra/guards/identity-jwt-tcp.guard';
import { IdentityOptionalJwtTcpGuard } from '@infra/guards/identity-optional-jwt-tcp.guard';
import { IdentityTcpClient } from '@infra/clients/identity/identity-tcp.client';
import { HealthController } from '@presentation/controllers/health.controller';
import { UrlController } from '@presentation/controllers/url.controller';

import { CreateShortUrlUseCase } from '@application/use-cases/create-short-url.usecase';
import { GetShortUrlStatsUseCase } from '@application/use-cases/get-short-url-stats.usecase';
import { ListUrlsUseCase } from '@application/use-cases/list-urls.usecase';
import { RedirectShortUrlUseCase } from '@application/use-cases/redirect-short-url.usecase';
import { SoftDeleteShortUrlUseCase } from '@application/use-cases/soft-delete-short-url.usecase';
import { UpdateShortUrlOriginUseCase } from '@application/use-cases/update-short-url-origin.usecase';

type RequestWithUser = FastifyRequest & {
  user?: {
    id: string;
    email: string;
    username: string;
  };
};

describe('UrlController (e2e)', () => {
  let app: NestFastifyApplication;

  const listUrlsUseCase = {
    execute: jest.fn(),
  };
  const getShortUrlStatsUseCase = {
    execute: jest.fn(),
  };
  const redirectShortUrlUseCase = {
    execute: jest.fn(),
    executeHumanized: jest.fn(),
    trackVisit: jest.fn(),
  };
  const createShortUrlUseCase = {
    execute: jest.fn(),
  };
  const softDeleteShortUrlUseCase = {
    execute: jest.fn(),
  };
  const updateShortUrlOriginUseCase = {
    execute: jest.fn(),
  };
  const identityClient = {
    findUserByUsername: jest.fn(),
  };
  const identityJwtTcpGuard = {
    canActivate: jest.fn((context: ExecutionContext) => {
      const request = context.switchToHttp().getRequest<RequestWithUser>();

      request.user = {
        id: 'user-id',
        email: 'user@mail.com',
        username: 'test-user',
      };

      return true;
    }),
  };
  const identityOptionalJwtTcpGuard = {
    canActivate: jest.fn((context: ExecutionContext) => {
      const request = context.switchToHttp().getRequest<RequestWithUser>();
      const authHeader = request.headers.authorization;

      if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        request.user = {
          id: 'user-id',
          email: 'user@mail.com',
          username: 'test-user',
        };
      }

      return true;
    }),
  };

  beforeAll(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [UrlController, HealthController],
      providers: [
        { provide: ListUrlsUseCase, useValue: listUrlsUseCase },
        { provide: GetShortUrlStatsUseCase, useValue: getShortUrlStatsUseCase },
        { provide: RedirectShortUrlUseCase, useValue: redirectShortUrlUseCase },
        { provide: CreateShortUrlUseCase, useValue: createShortUrlUseCase },
        { provide: SoftDeleteShortUrlUseCase, useValue: softDeleteShortUrlUseCase },
        { provide: UpdateShortUrlOriginUseCase, useValue: updateShortUrlOriginUseCase },
        { provide: IdentityTcpClient, useValue: identityClient },
      ],
    })
      .overrideGuard(IdentityJwtTcpGuard)
      .useValue(identityJwtTcpGuard)
      .overrideGuard(IdentityOptionalJwtTcpGuard)
      .useValue(identityOptionalJwtTcpGuard);

    const moduleRef = await moduleBuilder.compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.useGlobalFilters(new ResultExceptionFilter());

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /short-urls lists the authenticated user URLs', async () => {
    listUrlsUseCase.execute.mockResolvedValueOnce([{ id: '1', code: 'abc12345' }]);

    const response = await request(app.getHttpServer()).get('/short-urls').set('Authorization', 'Bearer token');

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual([{ id: '1', code: 'abc12345' }]);
    expect(identityJwtTcpGuard.canActivate).toHaveBeenCalledTimes(1);
    expect(listUrlsUseCase.execute.mock.calls).toEqual([['user-id']]);
  });

  it('GET /health returns the service health payload', async () => {
    const response = await request(app.getHttpServer()).get('/health');

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual({
      service: 'short-url',
      status: 'ok',
      dependencies: ['postgres', 'redis', 'identity-tcp'],
    });
  });

  it('POST /short-urls accepts optional auth and forwards the user id when present', async () => {
    createShortUrlUseCase.execute.mockResolvedValueOnce({
      id: '1',
      code: 'abc12345',
      origin: 'https://example.test',
    });

    const response = await request(app.getHttpServer()).post('/short-urls').set('Authorization', 'Bearer token').send({
      origin: 'https://example.test',
    });

    expect(response.status).toBe(HttpStatus.CREATED);
    expect(response.body).toEqual({
      id: '1',
      code: 'abc12345',
      origin: 'https://example.test',
    });
    expect(identityOptionalJwtTcpGuard.canActivate).toHaveBeenCalledTimes(1);
    expect(createShortUrlUseCase.execute.mock.calls).toEqual([['https://example.test', 'user-id']]);
  });

  it('POST /short-urls rejects invalid origins before reaching the use case', async () => {
    const response = await request(app.getHttpServer()).post('/short-urls').send({
      origin: 'invalid-url',
    });

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body.message).toEqual(["The value of 'origin' must be a valid URL!"]);
    expect(createShortUrlUseCase.execute).not.toHaveBeenCalled();
  });

  it('GET /short-urls/:shortUrlCode/stats returns the enriched stats payload', async () => {
    getShortUrlStatsUseCase.execute.mockResolvedValueOnce({
      id: '1',
      code: 'abc12345',
      origin: 'https://docs.example.test/reference',
      clicks: 8,
      createdAt: new Date('2026-03-16T12:00:00.000Z'),
      updatedAt: new Date('2026-03-18T12:00:00.000Z'),
      deletedAt: null,
      enrichment: {
        status: 'completed',
        attempts: 1,
        enrichedAt: new Date('2026-03-18T12:00:00.000Z'),
        riskLevel: 'low',
        category: 'documentation',
        summary: 'Example docs',
        tags: ['example', 'docs'],
        alternativeSlug: 'example-docs',
        provider: 'gemini',
        error: null,
      },
    });

    const response = await request(app.getHttpServer())
      .get('/short-urls/abc12345/stats')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toMatchObject({
      id: '1',
      code: 'abc12345',
      publicPaths: {
        shortened: '/abc12345',
        humanized: '/test-user/example-docs',
      },
      visitMetrics: {
        totalClicks: 8,
      },
      enrichment: {
        status: 'completed',
        alternativeSlug: 'example-docs',
        provider: 'gemini',
        hasHumanizedPath: true,
      },
    });
    expect(getShortUrlStatsUseCase.execute).toHaveBeenCalledWith('user-id', 'abc12345');
  });

  it('PATCH /short-urls/:shortUrlCode rejects invalid short codes before reaching the use case', async () => {
    const response = await request(app.getHttpServer())
      .patch('/short-urls/invalid-code!')
      .set('Authorization', 'Bearer token')
      .send({
        origin: 'https://docs.example.test/reference',
      });

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body.message).toBe('Invalid shortUrlCode format');
    expect(updateShortUrlOriginUseCase.execute).not.toHaveBeenCalled();
  });

  it('GET /:shortUrlCode redirects and tracks the visit', async () => {
    redirectShortUrlUseCase.execute.mockResolvedValueOnce({
      id: 'url-id',
      origin: 'https://docs.example.test/reference',
      enrichment: null,
    });

    redirectShortUrlUseCase.trackVisit.mockResolvedValueOnce(undefined);

    const response = await request(app.getHttpServer()).get('/abc12345');

    expect(response.status).toBe(HttpStatus.FOUND);
    expect(response.headers.location).toBe('https://docs.example.test/reference');
    expect(redirectShortUrlUseCase.execute.mock.calls).toEqual([['abc12345']]);
    expect(redirectShortUrlUseCase.trackVisit.mock.calls).toEqual([['url-id']]);
  });

  it('GET /:shortUrlCode shows a warning page when enrichment marks the link as high risk', async () => {
    redirectShortUrlUseCase.execute.mockResolvedValueOnce({
      id: 'url-id',
      origin: 'https://docs.example.test/reference',
      enrichment: {
        status: 'completed',
        riskLevel: 'high',
        summary: 'Potential phishing indicators',
        category: 'security',
      },
    });

    const response = await request(app.getHttpServer()).get('/abc12345');

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('secure-url-shortener');
    expect(response.text).toContain('Confirme antes de continuar.');
    expect(response.text).toContain('/abc12345?proceed=1');
    expect(redirectShortUrlUseCase.trackVisit).not.toHaveBeenCalled();
  });

  it('GET /:shortUrlCode?proceed=1 redirects even when the link is high risk', async () => {
    redirectShortUrlUseCase.execute.mockResolvedValueOnce({
      id: 'url-id',
      origin: 'https://docs.example.test/reference',
      enrichment: {
        status: 'completed',
        riskLevel: 'high',
      },
    });

    redirectShortUrlUseCase.trackVisit.mockResolvedValueOnce(undefined);

    const response = await request(app.getHttpServer()).get('/abc12345?proceed=1');

    expect(response.status).toBe(HttpStatus.FOUND);
    expect(response.headers.location).toBe('https://docs.example.test/reference');
    expect(redirectShortUrlUseCase.trackVisit.mock.calls).toEqual([['url-id']]);
  });

  it('GET /:username/:alternativeSlug redirects through the humanized path and tracks the visit', async () => {
    identityClient.findUserByUsername.mockResolvedValueOnce({
      isSuccess: true,
      value: { userId: 'user-id', username: 'test-user' },
    });

    redirectShortUrlUseCase.executeHumanized.mockResolvedValueOnce({
      id: 'url-id',
      origin: 'https://docs.example.test/reference',
      enrichment: null,
    });

    redirectShortUrlUseCase.trackVisit.mockResolvedValueOnce(undefined);

    const response = await request(app.getHttpServer()).get('/test-user/example-docs');

    expect(response.status).toBe(HttpStatus.FOUND);
    expect(response.headers.location).toBe('https://docs.example.test/reference');
    expect(identityClient.findUserByUsername.mock.calls).toEqual([['test-user']]);
    expect(redirectShortUrlUseCase.executeHumanized.mock.calls).toEqual([['user-id', 'example-docs']]);
    expect(redirectShortUrlUseCase.trackVisit.mock.calls).toEqual([['url-id']]);
  });

  it('GET /:username/:alternativeSlug shows a warning page when the humanized destination is high risk', async () => {
    identityClient.findUserByUsername.mockResolvedValueOnce({
      isSuccess: true,
      value: { userId: 'user-id', username: 'test-user' },
    });

    redirectShortUrlUseCase.executeHumanized.mockResolvedValueOnce({
      id: 'url-id',
      origin: 'https://docs.example.test/reference',
      enrichment: {
        status: 'completed',
        riskLevel: 'high',
      },
    });

    const response = await request(app.getHttpServer()).get('/test-user/example-docs');

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('/test-user/example-docs?proceed=1');
    expect(redirectShortUrlUseCase.trackVisit).not.toHaveBeenCalled();
  });
});
