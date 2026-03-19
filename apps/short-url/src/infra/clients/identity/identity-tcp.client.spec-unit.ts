import { throwError, of } from 'rxjs';
import type { ClientProxy } from '@nestjs/microservices';

import { Result } from '@application/result';
import { IdentityTcpClient } from '@infra/clients/identity/identity-tcp.client';

describe('IdentityTcpClient', () => {
  let clientProxyMock: jest.Mocked<ClientProxy>;
  let identityClient: IdentityTcpClient;

  beforeEach(() => {
    clientProxyMock = {
      send: jest.fn(),
    } as unknown as jest.Mocked<ClientProxy>;

    identityClient = new IdentityTcpClient(clientProxyMock);
  });

  it('returns the validation result from the identity microservice', async () => {
    const result = Result.ok({ userId: 'user-id', email: 'user@mail.com', username: 'test-user' });

    clientProxyMock.send.mockReturnValueOnce(of(result));

    await expect(identityClient.validateUserToken('jwt')).resolves.toBe(result);
    expect(clientProxyMock.send.mock.calls).toEqual([[{ cmd: 'validate_user_token' }, { token: 'jwt' }]]);
  });

  it('returns an authentication failure when the transport call fails', async () => {
    clientProxyMock.send.mockReturnValueOnce(throwError(() => new Error('tcp error')));

    await expect(identityClient.validateUserToken('jwt')).resolves.toEqual(
      Result.fail({
        status: 401,
        message: 'Erro de autenticação!',
      }),
    );
  });

  it('resolves a user by username through the identity microservice', async () => {
    const result = Result.ok({ userId: 'user-id', username: 'test-user' });

    clientProxyMock.send.mockReturnValueOnce(of(result));

    await expect(identityClient.findUserByUsername('test-user')).resolves.toBe(result);
    expect(clientProxyMock.send.mock.calls).toEqual([[{ cmd: 'find_user_by_username' }, { username: 'test-user' }]]);
  });

  it('returns a not found result when username lookup transport fails', async () => {
    clientProxyMock.send.mockReturnValueOnce(throwError(() => new Error('tcp error')));

    await expect(identityClient.findUserByUsername('test-user')).resolves.toEqual(
      Result.fail({
        status: 404,
        message: 'User not found or inactive!',
      }),
    );
  });
});
