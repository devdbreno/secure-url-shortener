import { IdentityOptionalJwtTcpGuard } from '@infra/guards/identity-optional-jwt-tcp.guard';

describe('IdentityOptionalJwtTcpGuard', () => {
  const authGuard = {
    canActivate: jest.fn(),
  };

  const guard = new IdentityOptionalJwtTcpGuard(authGuard as never);

  const makeContext = (authorization?: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: authorization ? { authorization } : {},
        }),
      }),
    }) as never;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows the request when there is no authorization header', async () => {
    await expect(guard.canActivate(makeContext())).resolves.toBe(true);
    expect(authGuard.canActivate).not.toHaveBeenCalled();
  });

  it('delegates to the required auth guard when there is an authorization header', async () => {
    authGuard.canActivate.mockResolvedValueOnce(true);

    await expect(guard.canActivate(makeContext('Bearer jwt'))).resolves.toBe(true);
    expect(authGuard.canActivate).toHaveBeenCalled();
  });
});
