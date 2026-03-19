import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('short_url_db.host'),
        port: configService.get<number>('short_url_db.port'),
        username: configService.get<string>('short_url_db.user'),
        password: configService.get<string>('short_url_db.password'),
        database: configService.get<string>('short_url_db.name'),
        entities: [__dirname + '/../persistence/*.entity{.ts,.js}'],
        synchronize: process.env.NODE_ENV !== 'production',
      }),
    }),
  ],
})
export class DatabaseModule {}
