export interface UrlPageContent {
  title?: string | null;
  description?: string | null;
  content?: string | null;
}

export interface IUrlPageContentFetcher {
  fetch(origin: string): Promise<UrlPageContent>;
}
