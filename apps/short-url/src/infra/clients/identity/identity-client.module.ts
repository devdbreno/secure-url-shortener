import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { IdentityTcpClient } from './identity-tcp.client';

import { IdentityJwtTcpGuard } from '@infra/guards/identity-jwt-tcp.guard';
import { IdentityOptionalJwtTcpGuard } from '@infra/guards/identity-optional-jwt-tcp.guard';

@Module({
  imports: [
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: 'IDENTITY_CLIENT',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('api.HOST_IDENTITY_TCP'),
            port: configService.get<number>('api.PORT_IDENTITY_TCP'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  exports: [IdentityTcpClient, IdentityJwtTcpGuard, IdentityOptionalJwtTcpGuard],
  providers: [IdentityTcpClient, IdentityJwtTcpGuard, IdentityOptionalJwtTcpGuard],
})
export class IdentityClientModule {}
