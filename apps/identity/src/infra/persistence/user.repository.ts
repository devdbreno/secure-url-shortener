import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { UserOrm } from './user.orm.entity';

import { User } from '@domain/entities/user.entity';
import { IUserRepository } from '@domain/repositories/user.repository';

/** Métodos do TypeORM usados por esta classe (o `Repository` injetado satisfaz este `Pick`). */
export type UserOrmRepository = Pick<Repository<UserOrm>, 'create' | 'save' | 'delete' | 'findOne'>;

export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserOrm)
    private repo: UserOrmRepository,
  ) {}

  public async create(data: Partial<UserOrm>): Promise<User> {
    const orm = this.repo.create(data);
    const saved = await this.repo.save(orm);

    return new User(
      saved.id,
      saved.email,
      saved.passwordHash,
      saved.username,
      saved.createdAt,
      saved.updatedAt,
      saved.deletedAt,
    );
  }
  public async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  public async findByEmail(email: string): Promise<User | null> {
    const found = await this.repo.findOne({ where: { email } });

    if (!found) return null;

    return new User(
      found.id,
      found.email,
      found.passwordHash,
      found.username,
      found.createdAt,
      found.updatedAt,
      found.deletedAt,
    );
  }

  public async findByUsername(username: string): Promise<User | null> {
    const found = await this.repo.findOne({ where: { username } });

    if (!found) return null;

    return new User(
      found.id,
      found.email,
      found.passwordHash,
      found.username,
      found.createdAt,
      found.updatedAt,
      found.deletedAt,
    );
  }

  public async findById(id: string): Promise<User | null> {
    const found = await this.repo.findOne({ where: { id } });

    if (!found) {
      return null;
    }

    return new User(
      found.id,
      found.email,
      found.passwordHash,
      found.username,
      found.createdAt,
      found.updatedAt,
      found.deletedAt,
    );
  }
}
