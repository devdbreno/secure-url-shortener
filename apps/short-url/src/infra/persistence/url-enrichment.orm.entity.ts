import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { UrlOrm } from './url.orm.entity';
import { UrlEnrichmentStatus } from '@domain/entities/url-enrichment.entity';

@Entity('url_enrichments')
export class UrlEnrichmentOrm {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { unique: true })
  urlId: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: UrlEnrichmentStatus;

  @Column('text', { nullable: true })
  summary?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category?: string | null;

  @Column('text', { array: true, default: () => "'{}'" })
  tags: string[];

  @Column({ type: 'varchar', length: 120, nullable: true })
  alternativeSlug?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  riskLevel?: string | null;

  @Column('text', { nullable: true })
  error?: string | null;

  @Column({ default: 0 })
  attempts: number;

  @Column({ type: 'timestamp', nullable: true })
  enrichedAt?: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => UrlOrm, (url) => url.enrichment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'urlId' })
  url: UrlOrm;
}
