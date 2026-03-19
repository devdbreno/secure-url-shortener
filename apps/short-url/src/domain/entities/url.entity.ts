import { UrlEnrichment } from './url-enrichment.entity';

export class Url {
  constructor(
    public id: string,
    public origin: string,
    public clicks: number,
    public userId: string | null,
    public code: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly deletedAt?: Date,
    public enrichment?: UrlEnrichment | null,
  ) {}
}
