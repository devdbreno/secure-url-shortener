import { ApiProperty } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterUserDTO {
  @ApiProperty({
    example: 'jane-doe',
    description: 'The public username of the user.',
    minLength: 3,
    maxLength: 30,
  })
  @Transform((tParams: TransformFnParams) =>
    typeof tParams.value === 'string' ? tParams.value.trim().toLowerCase() : tParams.value,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/, {
    message: 'username must contain only lowercase letters, numbers, hyphens, or underscores',
  })
  username: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'The email of the user.',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'securePassword123',
    minLength: 6,
    description: 'The password of the user.',
  })
  @IsString()
  @MinLength(6)
  password: string;

  constructor(email: string, password: string, username: string) {
    this.email = email;
    this.password = password;
    this.username = username;
  }
}
