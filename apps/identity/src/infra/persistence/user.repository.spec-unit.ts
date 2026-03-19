import { UserOrm } from './user.orm.entity';
import { UserRepository, type UserOrmRepository } from '@infra/persistence/user.repository';

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let ormRepositoryMock: jest.Mocked<UserOrmRepository>;

  beforeEach(() => {
    ormRepositoryMock = {
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findOne: jest.fn(),
    };

    userRepository = new UserRepository(ormRepositoryMock);
  });

  it('creates and maps a user', async () => {
    const input: Partial<UserOrm> = { email: 'user@mail.com', username: 'test-user', passwordHash: 'hash' };
    const afterCreate: UserOrm = {
      id: '1',
      email: 'user@mail.com',
      username: 'test-user',
      passwordHash: 'hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const saved: UserOrm = { ...afterCreate };

    ormRepositoryMock.create.mockReturnValueOnce(afterCreate);
    ormRepositoryMock.save.mockResolvedValueOnce(saved);

    const result = await userRepository.create(input);

    expect(ormRepositoryMock.create.mock.calls).toEqual([[input]]);
    expect(ormRepositoryMock.save.mock.calls).toEqual([[afterCreate]]);
    expect(result).toMatchObject({
      id: saved.id,
      email: saved.email,
      username: saved.username,
      passwordHash: saved.passwordHash,
    });
  });

  it('deletes a user by id', async () => {
    await userRepository.delete('user-id');

    expect(ormRepositoryMock.delete.mock.calls).toEqual([['user-id']]);
  });

  it('returns null when email is not found', async () => {
    ormRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(userRepository.findByEmail('missing@mail.com')).resolves.toBeNull();
  });

  it('maps a user when email is found', async () => {
    const found: UserOrm = {
      id: '1',
      email: 'user@mail.com',
      username: 'test-user',
      passwordHash: 'hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    ormRepositoryMock.findOne.mockResolvedValueOnce(found);

    await expect(userRepository.findByEmail('user@mail.com')).resolves.toMatchObject({
      id: found.id,
      email: found.email,
      username: found.username,
    });
  });

  it('returns null when username is not found', async () => {
    ormRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(userRepository.findByUsername('missing')).resolves.toBeNull();
  });

  it('maps a user when username is found', async () => {
    const found: UserOrm = {
      id: '1',
      email: 'user@mail.com',
      username: 'test-user',
      passwordHash: 'hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    ormRepositoryMock.findOne.mockResolvedValueOnce(found);

    await expect(userRepository.findByUsername('test-user')).resolves.toMatchObject({
      id: found.id,
      username: found.username,
    });
  });

  it('returns null when id is not found', async () => {
    ormRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(userRepository.findById('missing')).resolves.toBeNull();
  });

  it('maps a user when id is found', async () => {
    const found: UserOrm = {
      id: '1',
      email: 'user@mail.com',
      username: 'test-user',
      passwordHash: 'hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    ormRepositoryMock.findOne.mockResolvedValueOnce(found);

    await expect(userRepository.findById('1')).resolves.toMatchObject({
      id: found.id,
      email: found.email,
      username: found.username,
    });
  });
});
