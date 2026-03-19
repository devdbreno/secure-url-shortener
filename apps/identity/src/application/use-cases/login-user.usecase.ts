import { compare } from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';

import { LoginDTO } from '@presentation/dto/login.dto';
import { USER_REPOSITORY } from '@application/constants';
import { IUserRepository } from '@domain/repositories/user.repository';

@Injectable()
export class LoginUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private userRepo: IUserRepository,
    private jwtService: JwtService,
  ) {}

  public async execute(loginDTO: LoginDTO): Promise<{ token: string }> {
    const user = await this.userRepo.findByEmail(loginDTO.email);

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const isValid = await compare(loginDTO.password, user.passwordHash);

    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const payload = { email: user.email, sub: user.id, username: user.username };

    const token = await this.jwtService.signAsync(payload);

    return { token };
  }
}
