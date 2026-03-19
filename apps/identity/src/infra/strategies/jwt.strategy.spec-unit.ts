import { ConfigService } from '@nestjs/config';

import { JwtStrategy } from '@infra/strategies/jwt.strategy';

describe('JwtStrategy', () => {
  it('maps the jwt payload to the authenticated user shape', () => {
    const configServiceMock = {
      get: jest.fn().mockReturnValue('jwt-secret'),
    } as unknown as ConfigService;

    const strategy = new JwtStrategy(configServiceMock);

    expect(strategy.validate({ sub: 'user-id', email: 'user@mail.com', username: 'test-user' })).toEqual({
      userId: 'user-id',
      email: 'user@mail.com',
      username: 'test-user',
    });
  });

  it('uses the fallback secret path without affecting payload mapping', () => {
    const configServiceMock = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;

    const strategy = new JwtStrategy(configServiceMock);

    expect(strategy.validate({ sub: 'user-id', email: 'user@mail.com', username: 'test-user' })).toEqual({
      userId: 'user-id',
      email: 'user@mail.com',
      username: 'test-user',
    });
  });
});
