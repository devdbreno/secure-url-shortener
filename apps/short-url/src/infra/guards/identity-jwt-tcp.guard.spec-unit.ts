import { UnauthorizedException } from '@nestjs/common';

import { Result } from '@application/result';
import { IdentityJwtTcpGuard } from '@infra/guards/identity-jwt-tcp.guard';

describe('IdentityJwtTcpGuard', () => {
  const identityClient = {
    validateUserToken: jest.fn(),
  };

  const guard = new IdentityJwtTcpGuard(identityClient as never);

  const makeContext = (authorization?: unknown) => {
    const request: Record<string, unknown> = {
      headers: {},
    };

    if (authorization !== undefined) {
      request.headers = { authorization };
    }

    return {
      request,
      context: {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      },
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when the authorization header is missing', async () => {
    const { context } = makeContext();

    await expect(guard.canActivate(context as never)).rejects.toThrow(UnauthorizedException);
  });

  it('throws when the identity service rejects the token', async () => {
    const { context } = makeContext('Bearer jwt');
    identityClient.validateUserToken.mockResolvedValueOnce(
      Result.fail({
        status: 401,
        message: 'invalid token',
      }),
    );

    await expect(guard.canActivate(context as never)).rejects.toThrow('invalid token');
  });

  it('throws when the bearer token is empty after trimming', async () => {
    const { context } = makeContext('Bearer   ');

    await expect(guard.canActivate(context as never)).rejects.toThrow(UnauthorizedException);
  });

  it('attaches the user to the request when validation succeeds', async () => {
    const { context, request } = makeContext('Bearer jwt');
    identityClient.validateUserToken.mockResolvedValueOnce(
      Result.ok({
        userId: 'user-id',
        email: 'user@mail.com',
        username: 'test-user',
      }),
    );

    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'user-id', email: 'user@mail.com', username: 'test-user' });
  });

  it('returns false when the validation result succeeds without a payload', async () => {
    const { context } = makeContext('Bearer jwt');
    identityClient.validateUserToken.mockResolvedValueOnce({
      isSuccess: true,
      value: undefined,
    });

    await expect(guard.canActivate(context as never)).resolves.toBe(false);
  });
});
