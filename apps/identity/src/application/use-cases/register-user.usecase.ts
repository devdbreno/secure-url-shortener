import { hash } from 'bcryptjs';
import { Inject, Injectable, BadRequestException } from '@nestjs/common';

import { User } from '@domain/entities/user.entity';
import { IUserRepository } from '@domain/repositories/user.repository';

import { USER_REPOSITORY } from '@application/constants';
import { RegisterUserDTO } from '@presentation/dto/register.dto';

@Injectable()
export class RegisterUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private userRepo: IUserRepository) {}

  public async execute(registerDTO: RegisterUserDTO): Promise<User> {
    const [existingUser, existingUsername] = await Promise.all([
      this.userRepo.findByEmail(registerDTO.email),
      this.userRepo.findByUsername(registerDTO.username),
    ]);

    if (existingUser) {
      throw new BadRequestException('A user with this email already exists.');
    }

    if (existingUsername) {
      throw new BadRequestException('A user with this username already exists.');
    }

    const passwordHash = await hash(registerDTO.password, 10);

    const result = await this.userRepo.create({
      email: registerDTO.email,
      username: registerDTO.username,
      passwordHash,
    });

    return result;
  }
}
