import { Url } from '../entities/url.entity';
import { UrlEnrichmentOutput } from '@application/ports/outbound/url-enrichment.provider';

export interface IUrlRepository {
  create(origin: string, code: string, userId?: string): Promise<Url>;
  softDelete(id: string): Promise<void>;
  listByUser(userId: string): Promise<Url[]>;
  updateOrigin(id: string, origin: string, userId: string, code: string): Promise<Url>;
  incrementClicks(id: string): Promise<void>;
  failEnrichment(urlId: string, error: string, attempts?: number): Promise<void>;
  findByCode(code: string): Promise<Url | null>;
  completeEnrichment(urlId: string, enrichment: UrlEnrichmentOutput, attempts?: number): Promise<void>;
  claimPendingEnrichments(limit: number): Promise<Url[]>;
  findByCodeAndUserId(code: string, userId: string): Promise<Url | null>;
  findByAlternativeSlugAndUserId(alternativeSlug: string, userId: string): Promise<Url | null>;
}
