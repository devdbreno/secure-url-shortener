import { Inject, Injectable } from '@nestjs/common';

import { USER_REPOSITORY } from '@application/constants';
import { Result } from '@application/result';
import { IUserRepository } from '@domain/repositories/user.repository';

export interface IdentityPublicUserPayload {
  userId: string;
  username: string;
}

@Injectable()
export class FindUserByUsernameUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository) {}

  public async execute(username: string) {
    const normalizedUsername = username.trim().toLowerCase();

    const user = await this.userRepo.findByUsername(normalizedUsername);

    if (!user || user.deletedAt) {
      return Result.fail({
        status: 404,
        message: 'User not found or inactive!',
      });
    }

    return Result.ok<IdentityPublicUserPayload>({
      userId: user.id,
      username: user.username,
    });
  }
}
