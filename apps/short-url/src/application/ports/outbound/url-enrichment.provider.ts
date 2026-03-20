export type UrlRiskLevel = 'low' | 'medium' | 'high';
export type UrlEnrichmentProviderName = 'gemini' | 'heuristic';

export interface UrlEnrichmentInput {
  origin: string;
  pageTitle?: string | null;
  pageDescription?: string | null;
  pageContent?: string | null;
}

export interface UrlEnrichmentOutput {
  summary: string;
  category: string;
  tags: string[];
  alternativeSlug: string;
  riskLevel: UrlRiskLevel;
  provider: UrlEnrichmentProviderName;
}

export interface IUrlEnrichmentProvider {
  enrich(input: UrlEnrichmentInput): Promise<UrlEnrichmentOutput> | UrlEnrichmentOutput;
}
