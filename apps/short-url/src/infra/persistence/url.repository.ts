import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { UrlOrm } from './url.orm.entity';
import { UrlEnrichmentOrm } from './url-enrichment.orm.entity';

import { UrlEnrichmentOutput } from '@application/ports/outbound/url-enrichment.provider';
import { UrlEnrichment } from '@domain/entities/url-enrichment.entity';
import { Url } from '@domain/entities/url.entity';
import { IUrlRepository } from '@domain/repositories/url.repository';

@Injectable()
export class UrlRepository implements IUrlRepository {
  constructor(
    @InjectRepository(UrlOrm)
    private readonly repo: Repository<UrlOrm>,
  ) {}

  async create(origin: string, code: string, userId?: string) {
    const orm = this.repo.create({
      origin,
      code,
      userId,
      enrichment: {
        status: 'pending',
        tags: [],
        attempts: 0,
      },
    });

    const saved = await this.repo.save(orm);

    return this.toDomain(saved);
  }

  public async softDelete(id: string) {
    await this.repo.softDelete({ id });
  }

  public async incrementClicks(id: string) {
    await this.repo.increment({ id }, 'clicks', 1);
  }

  public async findByCode(code: string) {
    const found = await this.repo.findOne({ where: { code } });

    if (!found) return null;

    return this.toDomain(found);
  }

  public async listByUser(userId: string) {
    const items = await this.repo.find({ where: { userId } });

    return items.map((item) => this.toDomain(item));
  }

  public async updateOrigin(id: string, origin: string, userId: string, code: string) {
    const found = await this.repo.findOne({
      where: { id, userId, code, deletedAt: null },
    });

    if (!found) {
      return null;
    }

    found.origin = origin;
    found.userId = userId;
    found.code = code;

    found.enrichment ??= this.repo.manager.create(UrlEnrichmentOrm, {
      urlId: found.id,
      status: 'pending',
      tags: [],
      attempts: 0,
    });

    found.enrichment.status = 'pending';
    found.enrichment.summary = null;
    found.enrichment.category = null;
    found.enrichment.tags = [];
    found.enrichment.alternativeSlug = null;
    found.enrichment.riskLevel = null;
    found.enrichment.enrichedAt = null;
    found.enrichment.error = null;
    found.enrichment.attempts = 0;

    const saved = await this.repo.save(found);

    return this.toDomain(saved);
  }

  public async claimPendingEnrichments(limit: number): Promise<Url[]> {
    const items = await this.repo.manager.transaction(async (manager) => {
      const enrichmentRepo = manager.getRepository(UrlEnrichmentOrm);

      const pending = await enrichmentRepo
        .createQueryBuilder('enrichment')
        .innerJoinAndSelect('enrichment.url', 'url')
        .where('enrichment.status = :status', { status: 'pending' })
        .andWhere('url.deletedAt IS NULL')
        .orderBy('enrichment.createdAt', 'ASC')
        .limit(limit)
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .getMany();

      if (pending.length === 0) {
        return [];
      }

      pending.forEach((item) => {
        item.error = null;
        item.status = 'processing';
        item.attempts += 1;
      });

      await enrichmentRepo.save(pending);

      return pending.map((item) => item.url);
    });

    return items.map((item) => this.toDomain(item));
  }

  public async completeEnrichment(urlId: string, enrichment: UrlEnrichmentOutput, attempts?: number): Promise<void> {
    const updateData: Partial<UrlEnrichmentOrm> = {
      error: null,
      tags: enrichment.tags,
      status: 'completed',
      summary: enrichment.summary,
      category: enrichment.category,
      attempts: attempts ?? 0,
      enrichedAt: new Date(),
      riskLevel: enrichment.riskLevel,
      alternativeSlug: enrichment.alternativeSlug,
    };

    await this.repo.manager.getRepository(UrlEnrichmentOrm).update({ urlId }, updateData);
  }

  public async failEnrichment(urlId: string, error: string, attempts?: number): Promise<void> {
    const updateData: Partial<UrlEnrichmentOrm> = {
      error,
      status: 'failed',
      attempts: attempts ?? 0,
    };

    await this.repo.manager.getRepository(UrlEnrichmentOrm).update({ urlId }, updateData);
  }

  public async findByCodeAndUserId(code: string, userId: string) {
    const found = await this.repo.findOne({
      where: {
        userId,
        code,
        deletedAt: null,
      },
    });

    if (!found) return null;

    return this.toDomain(found);
  }

  public async findByAlternativeSlugAndUserId(alternativeSlug: string, userId: string) {
    const found = await this.repo.findOne({
      where: {
        userId,
        deletedAt: null,
        enrichment: {
          alternativeSlug,
        },
      },
    });

    if (!found) return null;

    return this.toDomain(found);
  }

  private toDomain(item: UrlOrm) {
    const enrichment = item.enrichment
      ? new UrlEnrichment(
          item.enrichment.id,
          item.enrichment.urlId,
          item.enrichment.status,
          item.enrichment.createdAt,
          item.enrichment.updatedAt,
          item.enrichment.summary,
          item.enrichment.category,
          item.enrichment.tags ?? [],
          item.enrichment.alternativeSlug,
          item.enrichment.riskLevel,
          item.enrichment.enrichedAt,
          item.enrichment.error,
          item.enrichment.attempts,
        )
      : null;

    return new Url(
      item.id,
      item.origin,
      item.clicks,
      item.userId,
      item.code,
      item.createdAt,
      item.updatedAt,
      item.deletedAt,
      enrichment,
    );
  }
}
