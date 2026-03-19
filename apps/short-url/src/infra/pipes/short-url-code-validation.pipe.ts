import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ShortUrlCodeValidationPipe implements PipeTransform {
  private readonly regex = /^[a-zA-Z0-9_-]{8}$/;

  transform(value: string): string {
    if (!this.regex.test(value)) throw new BadRequestException('Invalid shortUrlCode format');

    return value;
  }
}
