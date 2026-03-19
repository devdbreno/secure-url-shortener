import { NotFoundException } from '@nestjs/common';
import { Url } from '@domain/entities/url.entity';
import { AuthenticatedRequest } from '@infra/http/request-with-user.type';
import { IdentityTcpClient } from '@infra/clients/identity/identity-tcp.client';
import { UrlController } from '@presentation/controllers/url.controller';

jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'abc12345',
}));

interface MockRedirectReply {
  status: jest.Mock<MockRedirectReply, [number]>;
  type: jest.Mock<MockRedirectReply, [string]>;
  send: jest.Mock<string | void, [string]>;
  redirect: jest.Mock<string | void, [string]>;
}

describe('UrlController', () => {
  const listUseCase = { execute: jest.fn() };
  const getShortUrlStatsUseCase = { execute: jest.fn() };
  const redirectUrlUseCase = { execute: jest.fn(), executeHumanized: jest.fn(), trackVisit: jest.fn() };
  const createShortUrlUseCase = { execute: jest.fn() };
  const softDeleteShortUrlUseCase = { execute: jest.fn() };
  const updateShortUrlOriginUseCase = { execute: jest.fn() };
  const identityClient = { findUserByUsername: jest.fn() } satisfies Partial<IdentityTcpClient>;

  const controller = new UrlController(
    listUseCase as never,
    identityClient as never,
    redirectUrlUseCase as never,
    createShortUrlUseCase as never,
    getShortUrlStatsUseCase as never,
    softDeleteShortUrlUseCase as never,
    updateShortUrlOriginUseCase as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists urls for the authenticated user', async () => {
    const request = {
      user: { id: 'any-user-id', email: 'user@mail.com', username: 'test-user' },
    } as AuthenticatedRequest;

    const urls = [{ id: '1' }] as Url[];

    listUseCase.execute.mockResolvedValueOnce(urls);

    await expect(controller.listOwn(request)).resolves.toEqual(urls);

    expect(listUseCase.execute).toHaveBeenCalledTimes(1);
    expect(listUseCase.execute).toHaveBeenLastCalledWith<[string]>(request.user.id);
  });

  it('creates a short url for an optional user', async () => {
    createShortUrlUseCase.execute.mockResolvedValueOnce({ id: '1' });

    await expect(
      controller.shorten({ user: { id: 'user-id' } } as never, { origin: 'https://openai.com' }),
    ).resolves.toEqual({ id: '1' });
  });

  it('updates the origin for the authenticated user', async () => {
    updateShortUrlOriginUseCase.execute.mockResolvedValueOnce({ id: '1', origin: 'https://platform.openai.com' });

    await expect(
      controller.updateOrigin(
        { user: { id: 'user-id' } } as never,
        { origin: 'https://platform.openai.com' } as never,
        'abc12345',
      ),
    ).resolves.toEqual({
      id: '1',
      origin: 'https://platform.openai.com',
    });
  });

  it('soft deletes a short url and returns the confirmation message', async () => {
    await expect(controller.softDelete({ user: { id: 'user-id' } } as never, 'abc12345')).resolves.toEqual({
      message: 'Shortened URL successfully deleted.',
    });
    expect(softDeleteShortUrlUseCase.execute).toHaveBeenCalledWith('user-id', 'abc12345');
  });

  it('returns computed stats for the authenticated user', async () => {
    const createdAt = new Date('2026-03-16T12:00:00.000Z');
    const updatedAt = new Date('2026-03-18T12:00:00.000Z');

    getShortUrlStatsUseCase.execute.mockResolvedValueOnce({
      id: '1',
      code: 'abc12345',
      origin: 'https://openai.com/docs',
      clicks: 8,
      createdAt,
      updatedAt,
      deletedAt: null,
      enrichment: {
        status: 'completed',
        attempts: 1,
        enrichedAt: updatedAt,
        riskLevel: 'low',
        category: 'documentation',
        summary: 'OpenAI docs',
        tags: ['openai', 'docs'],
        alternativeSlug: 'openai-docs',
        error: null,
      },
    });

    const result = await controller.stats({ user: { id: 'user-id', username: 'test-user' } } as never, 'abc12345');

    expect(getShortUrlStatsUseCase.execute).toHaveBeenCalledWith('user-id', 'abc12345');
    expect(result).toMatchObject({
      id: '1',
      code: 'abc12345',
      publicPaths: {
        shortened: '/abc12345',
        humanized: '/test-user/openai-docs',
      },
      visitMetrics: {
        totalClicks: 8,
      },
      enrichment: {
        status: 'completed',
        alternativeSlug: 'openai-docs',
        hasHumanizedPath: true,
      },
    });
  });

  it('returns stats without humanized path when username or enrichment slug are unavailable', async () => {
    const createdAt = new Date('2026-03-19T12:00:00.000Z');
    const updatedAt = new Date('2026-03-19T12:00:00.000Z');
    const deletedAt = new Date('2026-03-20T12:00:00.000Z');

    getShortUrlStatsUseCase.execute.mockResolvedValueOnce({
      id: '1',
      code: 'abc12345',
      origin: 'https://openai.com/docs',
      clicks: 0,
      createdAt,
      updatedAt,
      deletedAt,
      enrichment: null,
    });

    const result = await controller.stats({ user: { id: 'user-id', username: '' } } as never, 'abc12345');

    expect(result).toMatchObject({
      publicPaths: {
        shortened: '/abc12345',
        humanized: null,
      },
      lifecycle: {
        deletedAt,
        isActive: false,
      },
      enrichment: null,
    });
  });

  it('maps nullable enrichment fields to nulls in the stats response', async () => {
    const createdAt = new Date('2026-03-19T12:00:00.000Z');
    const updatedAt = new Date('2026-03-19T12:00:00.000Z');

    getShortUrlStatsUseCase.execute.mockResolvedValueOnce({
      id: '1',
      code: 'abc12345',
      origin: 'https://openai.com/docs',
      clicks: 2,
      createdAt,
      updatedAt,
      deletedAt: null,
      enrichment: {
        status: 'completed',
        attempts: 1,
        enrichedAt: null,
        riskLevel: null,
        category: null,
        summary: null,
        tags: [],
        alternativeSlug: null,
        error: null,
      },
    });

    const result = await controller.stats({ user: { id: 'user-id', username: 'test-user' } } as never, 'abc12345');

    expect(result.enrichment).toEqual({
      status: 'completed',
      attempts: 1,
      enrichedAt: null,
      riskLevel: null,
      category: null,
      summary: null,
      tags: [],
      alternativeSlug: null,
      hasHumanizedPath: false,
      error: null,
    });
  });

  it('redirects and tracks the visit', async () => {
    const reply: MockRedirectReply = {
      status: jest.fn<MockRedirectReply, [number]>().mockReturnThis(),
      type: jest.fn<MockRedirectReply, [string]>().mockReturnThis(),
      send: jest.fn<string | void, [string]>(),
      redirect: jest.fn<string | void, [string]>().mockReturnValue('redirected'),
    };

    redirectUrlUseCase.execute.mockResolvedValueOnce({
      id: 'url-id',
      origin: 'https://openai.com',
      enrichment: null,
    });

    await expect(controller.redirect(reply as never, 'abc12345', undefined)).resolves.toBe('redirected');
    expect(redirectUrlUseCase.trackVisit).toHaveBeenCalledWith('url-id');
    expect(reply.status).toHaveBeenCalledWith(302);
    expect(reply.redirect).toHaveBeenCalledWith('https://openai.com');
  });

  it('shows a warning page instead of redirecting when the link risk is high', async () => {
    const reply: MockRedirectReply = {
      status: jest.fn<MockRedirectReply, [number]>().mockReturnThis(),
      type: jest.fn<MockRedirectReply, [string]>().mockReturnThis(),
      send: jest.fn<string | void, [string]>().mockReturnValue('warning-page'),
      redirect: jest.fn<string | void, [string]>(),
    };

    redirectUrlUseCase.execute.mockResolvedValueOnce({
      id: 'url-id',
      origin: 'https://openai.com',
      enrichment: {
        status: 'completed',
        riskLevel: 'high',
        summary: 'Potential phishing indicators',
        category: 'security',
      },
    });

    await expect(controller.redirect(reply as never, 'abc12345', undefined)).resolves.toBe('warning-page');

    expect(redirectUrlUseCase.trackVisit).not.toHaveBeenCalled();
    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.type).toHaveBeenCalledWith('text/html; charset=utf-8');
    expect(reply.send.mock.calls[0][0]).toContain('secure-url-shortener');
    expect(reply.send.mock.calls[0][0]).toContain('Confirme antes de continuar.');
    expect(reply.send.mock.calls[0][0]).toContain('/abc12345?proceed=1');
  });

  it('allows redirecting a high-risk link when proceed is confirmed', async () => {
    const reply: MockRedirectReply = {
      status: jest.fn<MockRedirectReply, [number]>().mockReturnThis(),
      type: jest.fn<MockRedirectReply, [string]>().mockReturnThis(),
      send: jest.fn<string | void, [string]>(),
      redirect: jest.fn<string | void, [string]>().mockReturnValue('redirected'),
    };

    redirectUrlUseCase.execute.mockResolvedValueOnce({
      id: 'url-id',
      origin: 'https://openai.com',
      enrichment: {
        status: 'completed',
        riskLevel: 'high',
      },
    });

    await expect(controller.redirect(reply as never, 'abc12345', '1')).resolves.toBe('redirected');
    expect(redirectUrlUseCase.trackVisit).toHaveBeenCalledWith('url-id');
    expect(reply.redirect).toHaveBeenCalledWith('https://openai.com');
  });

  it('redirects and tracks the visit through the humanized route', async () => {
    const reply: MockRedirectReply = {
      status: jest.fn<MockRedirectReply, [number]>().mockReturnThis(),
      type: jest.fn<MockRedirectReply, [string]>().mockReturnThis(),
      send: jest.fn<string | void, [string]>(),
      redirect: jest.fn<string | void, [string]>().mockReturnValue('redirected'),
    };

    identityClient.findUserByUsername.mockResolvedValueOnce({
      isSuccess: true,
      value: { userId: 'user-id', username: 'test-user' },
    } as never);
    redirectUrlUseCase.executeHumanized.mockResolvedValueOnce({
      id: 'url-id',
      origin: 'https://openai.com/docs',
      enrichment: null,
    });

    await expect(controller.redirectHumanized(reply as never, 'test-user', 'openai-docs', undefined)).resolves.toBe(
      'redirected',
    );
    expect(identityClient.findUserByUsername).toHaveBeenCalledWith('test-user');
    expect(redirectUrlUseCase.executeHumanized).toHaveBeenCalledWith('user-id', 'openai-docs');
    expect(redirectUrlUseCase.trackVisit).toHaveBeenCalledWith('url-id');
    expect(reply.status).toHaveBeenCalledWith(302);
    expect(reply.redirect).toHaveBeenCalledWith('https://openai.com/docs');
  });

  it('shows the warning page on the humanized route when the risk is high', async () => {
    const reply: MockRedirectReply = {
      status: jest.fn<MockRedirectReply, [number]>().mockReturnThis(),
      type: jest.fn<MockRedirectReply, [string]>().mockReturnThis(),
      send: jest.fn<string | void, [string]>().mockReturnValue('warning-page'),
      redirect: jest.fn<string | void, [string]>(),
    };

    identityClient.findUserByUsername.mockResolvedValueOnce({
      isSuccess: true,
      value: { userId: 'user-id', username: 'test-user' },
    } as never);

    redirectUrlUseCase.executeHumanized.mockResolvedValueOnce({
      id: 'url-id',
      origin: 'https://openai.com/docs',
      enrichment: {
        status: 'completed',
        riskLevel: 'high',
      },
    });

    await expect(controller.redirectHumanized(reply as never, 'test-user', 'openai-docs', undefined)).resolves.toBe(
      'warning-page',
    );
    expect(redirectUrlUseCase.trackVisit).not.toHaveBeenCalled();
    expect(reply.send.mock.calls[0][0]).toContain('/test-user/openai-docs?proceed=1');
  });

  it('throws not found when the username cannot be resolved in the humanized route', async () => {
    const reply: MockRedirectReply = {
      status: jest.fn<MockRedirectReply, [number]>().mockReturnThis(),
      type: jest.fn<MockRedirectReply, [string]>().mockReturnThis(),
      send: jest.fn<string | void, [string]>(),
      redirect: jest.fn<string | void, [string]>(),
    };

    identityClient.findUserByUsername.mockResolvedValueOnce({
      isSuccess: false,
      value: null,
    } as never);

    await expect(
      controller.redirectHumanized(reply as never, 'missing-user', 'openai-docs', undefined),
    ).rejects.toThrow(NotFoundException);
    expect(redirectUrlUseCase.executeHumanized).not.toHaveBeenCalled();
    expect(redirectUrlUseCase.trackVisit).not.toHaveBeenCalled();
  });
});
