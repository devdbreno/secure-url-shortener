# secure-url-shortener

> English version: veja [README.en.md](./README.en.md).

Monorepo com dois microservices NestJS para encurtamento seguro de URLs, autenticação, enrichment assíncrono de destinos e redirecionamento com barreira de risco.

## O que o projeto entrega

- `Identity`: registro, login, perfil autenticado, validação JWT e resolução pública de usuário por `username`.
- `Short-url`: criação, listagem, atualização, exclusão lógica, estatísticas e redirecionamento de links curtos.
- Criação de link com autenticação opcional: anônimo ou associado ao usuário autenticado.
- Enrichment assíncrono com `summary`, `category`, `tags`, `alternativeSlug`, `riskLevel` e `provider`.
- Rota humanizada baseada em `username + alternativeSlug`.
- Página HTML de confirmação antes do redirect quando o destino é classificado com `riskLevel=high`.
- Comunicação service-to-service via Nest TCP entre `Short-url` e `Identity`.

## Valor técnico do projeto

Do ponto de vista de arquitetura e entrevista técnica, este projeto demonstra:

- separação clara entre contexto de identidade e contexto de URLs;
- caminho síncrono curto para escrita e caminho assíncrono para processamento pesado;
- contratos explícitos entre serviços distribuídos;
- integração com IA tratada como detalhe de infraestrutura;
- fallback determinístico quando o provider principal falha;
- readiness operacional com `healthcheck` HTTP e dependências explícitas no `docker-compose`;
- preocupação explícita com segurança no fetch do conteúdo e no redirect público.

## Documentação de rotas

- Rotas HTTP e contratos internos: [ROUTES.md](./ROUTES.md)
- Swagger Identity: `http://localhost:4000/api-docs`
- Swagger Short URL: `http://localhost:4001/api-docs`

## Stack técnica

- NestJS
- Fastify
- TypeScript
- PostgreSQL
- Redis
- BullMQ
- TypeORM
- Docker Compose
- Yarn 4 Workspaces
- Google Gemini como provider principal de enrichment

## Desenho técnico da arquitetura

### Topologia dos serviços distribuídos

![](system-distribution-scheme.png)

### Fluxo dos casos de uso + fila + serviços

![](usecases-queue-services-flow-scheme.png)

## Estrutura do monorepo

```text
apps/
  identity/
  short-url/
```

Cada app segue a divisão:

- `domain`
- `application`
- `infra`
- `presentation`

## Visão arquitetural

### `IDENTITY`

Responsável por:

- criar usuários com `email`, `password` e `username`;
- autenticar usuários e emitir JWT;
- validar tokens consumidos pelo `short-url`;
- resolver `username -> userId` para a rota humanizada.

O `identity` é a fonte de verdade para autenticação e identidade pública. Isso evita duplicar cadastro, validação de token e lookup de usuário dentro do serviço de URLs.

### `SHORT_URL`

Responsável por:

- encurtar URLs;
- manter ownership opcional por usuário autenticado;
- listar links do usuário autenticado;
- atualizar destino e limpar o enrichment anterior;
- excluir links logicamente;
- enriquecer destinos em background;
- redirecionar por `code` ou por rota humanizada;
- exigir confirmação explícita quando o enrichment indicar risco alto.

O `short-url` concentra o domínio de links e delega autenticação ao `identity`, mantendo o boundary entre contextos explícito.

## Fluxo ponta a ponta

### 1. Cadastro e autenticação

- O usuário se registra com `email`, `password` e `username`.
- O `username` é normalizado para lowercase e deve ser único.
- O login retorna um JWT com `sub`, `email` e `username`.
- O `short-url` usa esse token para operações autenticadas.

### 2. Criação do link curto

- `POST /short-urls` aceita autenticação opcional.
- A URL curta é criada imediatamente com `code` alfanumérico de 8 caracteres.
- O tempo de resposta da criação não depende do enrichment.
- Após persistir a URL, a aplicação envia um job para a fila de enrichment.

### 3. Despacho assíncrono para a fila

O dispatcher BullMQ agenda o job com:

- delay inicial de 5 segundos;
- até 5 tentativas;
- backoff exponencial;
- limpeza de histórico com `removeOnComplete` e `removeOnFail`.

### 4. Fetch seguro do conteúdo da página

O worker busca o conteúdo da URL original antes de enriquecer.

O fetcher:

- usa page fetch browser-assisted via `Impit` como estratégia padrão;
- aceita apenas `http` e `https`;
- rejeita `localhost`, faixas privadas e hosts inseguros;
- aplica timeout configurável;
- extrai `title`, `meta description` e texto limpo do HTML;
- faz fallback para metadados mínimos quando a resposta não é `text/html`.

### 5. Pipeline de enrichment

1. A criação da URL agenda um job BullMQ.
2. O worker busca metadados e conteúdo da página de destino.
3. O provider composto tenta enriquecer a URL.
4. O resultado persiste `summary`, `category`, `tags`, `alternativeSlug`, `riskLevel` e `provider`.

Arquivos centrais desse fluxo:

- Dispatcher da fila: [bullmq-url-enrichment-job.dispatcher.ts](./apps/short-url/src/infra/queue/bullmq-url-enrichment-job.dispatcher.ts)
- Worker: [url-enrichment.worker.ts](./apps/short-url/src/infra/enrichment/workers/url-enrichment.worker.ts)
- Fetcher de conteúdo: [url-page-content-fetcher.service.ts](./apps/short-url/src/infra/enrichment/services/url-page-content-fetcher.service.ts)
- Provider com fallback: [fallback-url-enrichment.provider.ts](./apps/short-url/src/infra/enrichment/providers/fallback-url-enrichment.provider.ts)
- Provider Gemini: [gemini-url-enrichment.provider.ts](./apps/short-url/src/infra/enrichment/providers/gemini-url-enrichment.provider.ts)
- Provider heurístico: [heuristic-url-enrichment.provider.ts](./apps/short-url/src/infra/enrichment/providers/heuristic-url-enrichment.provider.ts)

### 6. Atualização do destino

- `PATCH /short-urls/:shortUrlCode` exige autenticação e ownership do link.
- A URL de destino é atualizada.
- O enrichment armazenado é limpo e volta para `pending`.
- `summary`, `category`, `tags`, `alternativeSlug`, `provider`, `riskLevel`, `error` e `enrichedAt` anteriores são descartados.

### 7. Estatísticas autenticadas

- `GET /short-urls/:shortUrlCode/stats`
- Retorna `totalClicks`, média de cliques por dia, idade do link, estado do enrichment, tentativas, `riskLevel`, `provider` e disponibilidade da rota humanizada.
- É uma rota útil para dashboard operacional sem depender de uma tabela completa de eventos.

### 8. Redirect clássico

- `GET /:shortUrlCode`
- Se a URL não tiver enrichment de alto risco, responde com `302` e contabiliza clique.
- Se a URL tiver `riskLevel=high`, retorna uma página HTML de alerta.
- O parâmetro `proceed` aceita `1`, `true` ou `yes` para forçar a continuidade.

### 9. Redirect humanizado

- `GET /:username/:alternativeSlug`
- Resolve o `username` no `identity`.
- Busca a URL do dono cujo enrichment produziu o `alternativeSlug`.
- Aplica a mesma regra de segurança do redirect clássico.

## Comunicação entre serviços

O `short-url` depende do `identity` para dois contratos internos via Nest TCP:

- `validate_user_token`
- `find_user_by_username`

Em termos práticos:

- requisições autenticadas chegam ao `short-url`;
- o guard consulta o `identity`;
- o `identity` valida o JWT e devolve `userId`, `email` e `username`;
- a rota humanizada consulta o `identity` para resolver `username -> userId`.

## Regras de segurança relevantes

- O `identity` exige `username` único no registro.
- O `username` aceito no cadastro deve ter entre 3 e 30 caracteres, em lowercase, com letras, números, hífen ou underscore.
- O `shortUrlCode` aceito nas rotas protegidas e públicas deve ter exatamente 8 caracteres alfanuméricos.
- O fetch de conteúdo rejeita protocolos e hosts inseguros.
- O `short-url` não redireciona automaticamente URLs com `riskLevel=high`.
- O clique só é contabilizado quando o redirect realmente acontece.

## Pré-requisitos

- Node.js 20+
- Corepack habilitado
- Yarn 4
- Docker
- Docker Compose

## Configuração inicial

1. Clone o repositório.
2. Copie as variáveis de ambiente.
3. Instale as dependências.

```bash
cp .env.example .env
corepack enable
yarn install
```

## Variáveis de ambiente

O projeto usa um único `.env` na raiz do monorepo.

Grupos mais relevantes:

- API
  - `PORT_IDENTITY`
  - `PORT_SHORT_URL`
  - `PORT_IDENTITY_TCP`
  - `HOST_IDENTITY_TCP`
- JWT
  - `JWT_SECRET`
  - `JWT_EXPIRATION`
- AI / enrichment
  - `AI_ENRICHMENT_ENABLED`
  - `AI_PAGE_MAX_CHARS`
  - `AI_PAGE_FETCH_TIMEOUT_MS`
- Gemini
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL`
- Redis
  - `REDIS_HOST`
  - `REDIS_PORT`
  - `REDIS_PASSWORD`
- Banco do `identity`
  - `DB_IDENTITY_*`
- Banco do `short-url`
  - `DB_SHORT_URL_*`

Use [.env.example](./.env.example) como base.

## Subindo com Docker

Subir a stack inteira:

```bash
docker compose up --build
```

Serviços expostos:

- Identity HTTP: `http://localhost:4000`
- Identity TCP: `localhost:4002`
- Health Identity: `http://localhost:4000/health`
- Short URL HTTP: `http://localhost:4001`
- Health Short URL: `http://localhost:4001/health`
- Swagger Identity: `http://localhost:4000/api-docs`
- Swagger Short URL: `http://localhost:4001/api-docs`

O `docker-compose` agora também espera `postgres`, `redis` e `identity` ficarem saudáveis antes de subir o `short-url`.

Parar a stack:

```bash
docker compose down
```

Parar e remover volumes:

```bash
docker compose down -v
```

## Rodando localmente

Subir apenas infraestrutura:

```bash
docker compose up postgres-identity postgres-short-url redis -d
```

Rodar os apps separadamente:

```bash
yarn start:identity:dev
yarn start:url:dev
```

Rodar os dois juntos:

```bash
yarn start:dev
```

## Build

Todos os workspaces:

```bash
yarn build
```

Build por app:

```bash
yarn workspace @secure-url-shortener/identity build
yarn workspace @secure-url-shortener/short-url build
```

## Testes

Todos os testes dos workspaces:

```bash
yarn test
yarn test:unit
yarn test:e2e
```

Por app:

```bash
yarn workspace @secure-url-shortener/identity test
yarn workspace @secure-url-shortener/short-url test
```

Cobertura por app:

```bash
yarn workspace @secure-url-shortener/identity test:cov
yarn workspace @secure-url-shortener/short-url test:cov
```

E2E por app:

```bash
yarn workspace @secure-url-shortener/identity test:e2e
yarn workspace @secure-url-shortener/short-url test:e2e
```

Os testes cobrem principalmente:

- validação de DTOs;
- guards de autenticação;
- payloads de autenticação;
- lookup por `username`;
- redirect clássico;
- redirect humanizado;
- aviso HTML para URLs de alto risco.

## Lint e formatação

```bash
yarn lint
yarn format
```

Por app:

```bash
yarn workspace @secure-url-shortener/identity lint
yarn workspace @secure-url-shortener/short-url lint
```

## Observações

- O schema do banco é sincronizado automaticamente fora de produção (`synchronize`).
- O enrichment só roda quando `AI_ENRICHMENT_ENABLED=true`.
- Com o pipeline ativo, o provider composto tenta Gemini primeiro e usa heurística se o provider principal falhar.
- O `provider` persistido em `url_enrichments` indica qual engine gerou o enrichment final (`gemini` ou `heuristic`).
