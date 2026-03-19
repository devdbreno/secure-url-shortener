export interface UrlEnrichmentJobPayload {
  urlId: string;
  origin: string;
}

export interface IUrlEnrichmentJobDispatcher {
  dispatch(payload: UrlEnrichmentJobPayload): Promise<void>;
}
