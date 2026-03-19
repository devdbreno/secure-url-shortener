import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Inject, Injectable } from '@nestjs/common';

import { Result } from '@application/result';

interface IdentityAuthPayload {
  email: string;
  userId: string;
  username: string;
}

interface IdentityPublicUserPayload {
  userId: string;
  username: string;
}

@Injectable()
export class IdentityTcpClient {
  constructor(@Inject('IDENTITY_CLIENT') private readonly identityClient: ClientProxy) {}

  public async validateUserToken(token: string) {
    try {
      const result = await firstValueFrom(
        this.identityClient.send<Result<IdentityAuthPayload>>({ cmd: 'validate_user_token' }, { token }),
      );

      return result;
    } catch (_err) {
      return Result.fail({
        status: 401,
        message: 'Erro de autenticação!',
      });
    }
  }

  public async findUserByUsername(username: string) {
    try {
      const result = await firstValueFrom(
        this.identityClient.send<Result<IdentityPublicUserPayload>>({ cmd: 'find_user_by_username' }, { username }),
      );

      return result;
    } catch (_err) {
      return Result.fail({
        status: 404,
        message: 'User not found or inactive!',
      });
    }
  }
}
