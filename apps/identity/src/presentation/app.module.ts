import { Module } from '@nestjs/common';

import { AuthModule } from '@presentation/auth.module';
import { AppConfigModule } from '@infra/config/config.module';

@Module({
  imports: [AppConfigModule, AuthModule],
})
export class AppModule {}
