import { ConfigModule } from '@nestjs/config';
import { Global, Module } from '@nestjs/common';

import apiConfig from './api.config';
import databaseConfig from './db.config';
import geminiConfig from './gemini.config';
import redisConfig from './redis.config';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env'],
      load: [apiConfig, databaseConfig, geminiConfig, redisConfig],
    }),
  ],
})
export class AppConfigModule {}
