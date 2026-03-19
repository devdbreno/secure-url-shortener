import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

import { IdentityJwtTcpGuard } from './identity-jwt-tcp.guard';
import { OptionalUserRequest } from '../http/request-with-user.type';

@Injectable()
export class IdentityOptionalJwtTcpGuard implements CanActivate {
  constructor(private readonly authGuard: IdentityJwtTcpGuard) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<OptionalUserRequest>();
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      return true;
    }

    return this.authGuard.canActivate(ctx);
  }
}
