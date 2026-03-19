import {
  Entity,
  Column,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { UrlEnrichmentOrm } from './url-enrichment.orm.entity';

@Entity('urls')
export class UrlOrm {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  origin: string;

  @Column({ length: 8, unique: true })
  code: string;

  @Column({ default: 0 })
  clicks: number;

  @Column({ nullable: true })
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @OneToOne(() => UrlEnrichmentOrm, (enrichment) => enrichment.url, {
    cascade: true,
    eager: true,
  })
  enrichment?: UrlEnrichmentOrm | null;
}
