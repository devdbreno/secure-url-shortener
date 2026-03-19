import { Url } from '@domain/entities/url.entity';

export function renderHighRiskWarningPage(shortUrl: Url, continuePath: string) {
  const summary = shortUrl.enrichment?.summary ? escapeHtml(shortUrl.enrichment.summary) : null;
  const category = shortUrl.enrichment?.category ? escapeHtml(shortUrl.enrichment.category) : null;

  const origin = escapeHtml(shortUrl.origin);

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>secure-url-shortener | alerta de risco</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f4f6f8;
        --card: #ffffff;
        --text: #13202b;
        --muted: #5f6b76;
        --border: #d8e0e7;
        --danger: #c23b2a;
        --danger-soft: #fff1ef;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background: linear-gradient(180deg, #f8fafb 0%, var(--bg) 100%);
        font-family: Inter, "Segoe UI", system-ui, sans-serif;
        color: var(--text);
      }
      main {
        width: min(560px, 100%);
        padding: 28px;
        border: 1px solid var(--border);
        border-radius: 20px;
        background: var(--card);
        box-shadow: 0 20px 48px rgba(19, 32, 43, 0.08);
      }
      .brand {
        display: inline-flex;
        align-items: center;
        padding: 6px 10px;
        border-radius: 999px;
        background: #eef3f7;
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .alert {
        margin-top: 14px;
        color: var(--danger);
        font-size: 13px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      h1 {
        margin: 10px 0 12px;
        font-size: 32px;
        line-height: 1.05;
      }
      p {
        margin: 0;
        color: var(--muted);
        font-size: 15px;
        line-height: 1.6;
      }
      dl {
        margin: 20px 0 0;
        display: grid;
        gap: 12px;
      }
      .row {
        padding: 14px 16px;
        border-radius: 14px;
        border: 1px solid var(--border);
        background: #fbfcfd;
      }
      dt {
        margin: 0 0 6px;
        font-size: 12px;
        font-weight: 700;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      dd {
        margin: 0;
        font-size: 14px;
        line-height: 1.5;
        word-break: break-word;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 22px;
      }
      .button {
        min-height: 44px;
        padding: 0 16px;
        border-radius: 12px;
        border: 1px solid transparent;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 700;
        text-decoration: none;
      }
      .button-secondary {
        color: var(--text);
        background: #f5f7f9;
        border-color: var(--border);
      }
      .button-primary {
        color: #fff;
        background: var(--danger);
      }
    </style>
  </head>
  <body>
    <main>
      <span class="brand">secure-url-shortener</span>
      <div class="alert">Risco alto</div>
      <h1>Confirme antes de continuar.</h1>
      <p>Este destino foi marcado como arriscado. Continue apenas se voce confia na origem.</p>
      <dl>
        <div class="row">
          <dt>Destino</dt>
          <dd>${origin}</dd>
        </div>
        ${category ? `<div class="row"><dt>Categoria</dt><dd>${category}</dd></div>` : ''}
        ${summary ? `<div class="row"><dt>Resumo</dt><dd>${summary}</dd></div>` : ''}
      </dl>
      <div class="actions">
        <a class="button button-secondary" href="javascript:history.back()">Voltar</a>
        <a class="button button-primary" href="${continuePath}">Continuar</a>
      </div>
    </main>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
