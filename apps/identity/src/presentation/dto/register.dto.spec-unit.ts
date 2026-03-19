import { plainToInstance } from 'class-transformer';

import { RegisterUserDTO } from './register.dto';

describe('RegisterUserDTO', () => {
  it('transforms username with trim and lowercase (@Transform runs on plainToInstance)', () => {
    const dto = plainToInstance(RegisterUserDTO, {
      email: 'user@mail.com',
      password: 'secret12345',
      username: '  Jane-Doe  ',
    });

    expect(dto.username).toBe('jane-doe');
  });

  it('leaves username unchanged when value is not a string', () => {
    const dto = plainToInstance(RegisterUserDTO, {
      email: 'user@mail.com',
      password: 'secret12345',
      username: 12345,
    });

    expect(dto.username).toBe(12345);
  });
});
