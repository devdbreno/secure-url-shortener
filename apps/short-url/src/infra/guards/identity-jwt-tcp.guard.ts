import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { IdentityTcpClient } from '../clients/identity/identity-tcp.client';
import { OptionalUserRequest } from '../http/request-with-user.type';

@Injectable()
export class IdentityJwtTcpGuard implements CanActivate {
  constructor(private readonly identityClient: IdentityTcpClient) {}

  public async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<OptionalUserRequest>();
    const authHeader = req.headers['authorization'];

    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Malformed or missing token!');
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      throw new UnauthorizedException('Malformed or missing token!');
    }

    const result = await this.identityClient.validateUserToken(token);

    if (!result.isSuccess) {
      throw new UnauthorizedException(result.error.message);
    }

    if (result.isSuccess && result.value) {
      req.user = { id: result.value.userId, email: result.value.email, username: result.value.username };

      return true;
    }

    return false;
  }
}
