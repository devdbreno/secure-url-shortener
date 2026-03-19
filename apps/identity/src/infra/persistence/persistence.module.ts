import { TypeOrmModule } from '@nestjs/typeorm';
import { Module, DynamicModule, Provider } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';

@Module({})
export class PersistenceModule {
  /**
   * @param entities Array de classes de entidade ORM (ex: [UserOrm, OrderOrm])
   * @param providers Array de providers, cada um deve ser ou um ClassProvider [{ provide, useClass }] ou uma classe [UserRepository]
   */
  static forFeature(entities: Array<new (...args: never[]) => object>, providers: Provider[]): DynamicModule {
    const exportTokens = providers.map((provider) => (typeof provider === 'function' ? provider : provider.provide));

    return {
      module: PersistenceModule,
      imports: [DatabaseModule, TypeOrmModule.forFeature(entities)],
      providers,
      exports: exportTokens,
    };
  }
}
