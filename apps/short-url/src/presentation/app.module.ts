import { Module } from '@nestjs/common';

import { AppConfigModule } from '@infra/config/config.module';
import { UrlModule } from '@presentation/url.module';

@Module({
  imports: [UrlModule, AppConfigModule],
})
export class AppModule {}
