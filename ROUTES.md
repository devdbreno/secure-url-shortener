# Rotas do projeto

Guia direto das rotas HTTP públicas e dos contratos internos usados entre os microservices.

## Convenções gerais

- Base local do `identity`: `http://localhost:4000`
- Base local do `short-url`: `http://localhost:4001`
- O `shortUrlCode` válido tem exatamente 8 caracteres alfanuméricos.
- Em `POST /short-urls`, o header `Authorization` é opcional.
- Nos redirects de alto risco, `proceed=1`, `proceed=true` ou `proceed=yes` libera a continuação.

## Identity HTTP

### `POST /auth/register`

Cria um usuário.

Regras relevantes:

- `username` é obrigatório, entre 3 e 30 caracteres.
- `username` é normalizado para lowercase.
- `username` aceita apenas letras minúsculas, números, hífen e underscore.
- `email` deve ser válido.
- `password` deve ter pelo menos 6 caracteres.

Body:

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "username": "jane-doe"
}
```

Resposta `201`:

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "jane-doe"
}
```

### `POST /auth/login`

Autentica um usuário registrado.

Body:

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

Resposta `200`:

```json
{
  "token": "jwt-token"
}
```

### `GET /auth/profile`

Retorna o usuário autenticado.

Headers:

```text
Authorization: Bearer <jwt>
```

Resposta `200`:

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "username": "jane-doe"
}
```

## Short URL HTTP

### `GET /short-urls`

Lista os links do usuário autenticado.

Headers:

```text
Authorization: Bearer <jwt>
```

Resposta típica `200`:

```json
[
  {
    "id": "uuid",
    "origin": "https://example.com/some/path",
    "clicks": 0,
    "userId": "uuid",
    "code": "abc12345",
    "createdAt": "2026-03-18T12:00:00.000Z",
    "updatedAt": "2026-03-18T12:00:00.000Z",
    "enrichment": {
      "status": "pending",
      "tags": [],
      "attempts": 0
    }
  }
]
```

### `POST /short-urls`

Cria uma URL curta. Pode ser anônima ou associada ao usuário autenticado.

Headers opcionais:

```text
Authorization: Bearer <jwt>
```

Body:

```json
{
  "origin": "https://example.com/some/path"
}
```

Resposta típica `201`:

```json
{
  "id": "uuid",
  "origin": "https://example.com/some/path",
  "clicks": 0,
  "userId": "uuid-or-null",
  "code": "abc12345",
  "createdAt": "2026-03-18T12:00:00.000Z",
  "updatedAt": "2026-03-18T12:00:00.000Z",
  "enrichment": {
    "status": "pending",
    "tags": [],
    "attempts": 0
  }
}
```

### `GET /short-urls/:shortUrlCode/stats`

Retorna um payload operacional para o dono do link.

Headers:

```text
Authorization: Bearer <jwt>
```

Resposta típica `200`:

```json
{
  "id": "uuid",
  "code": "abc12345",
  "origin": "https://example.com/some/path",
  "publicPaths": {
    "shortened": "/abc12345",
    "humanized": "/jane-doe/example-page"
  },
  "visitMetrics": {
    "totalClicks": 42,
    "averageClicksPerDay": 3.5
  },
  "lifecycle": {
    "createdAt": "2026-03-18T12:00:00.000Z",
    "updatedAt": "2026-03-18T12:10:00.000Z",
    "deletedAt": null,
    "ageInDays": 12,
    "isActive": true
  },
  "enrichment": {
    "status": "completed",
    "attempts": 1,
    "enrichedAt": "2026-03-18T12:05:00.000Z",
    "riskLevel": "low",
    "category": "documentation",
    "summary": "Page summary",
    "tags": ["docs", "api"],
    "alternativeSlug": "example-page",
    "hasHumanizedPath": true,
    "error": null
  }
}
```

### `PATCH /short-urls/:shortUrlCode`

Atualiza a URL de destino de um link curto pertencente ao usuário autenticado.

Headers:

```text
Authorization: Bearer <jwt>
```

Body:

```json
{
  "origin": "https://example.com/new-destination"
}
```

Comportamento:

- exige ownership do link;
- atualiza `origin`;
- limpa os dados anteriores de enrichment;
- mantém o enrichment em `pending` com `attempts=0`.

Resposta típica `200`:

```json
{
  "id": "uuid",
  "origin": "https://example.com/new-destination",
  "clicks": 42,
  "userId": "uuid",
  "code": "abc12345",
  "createdAt": "2026-03-18T12:00:00.000Z",
  "updatedAt": "2026-03-19T09:00:00.000Z",
  "enrichment": {
    "status": "pending",
    "tags": [],
    "attempts": 0
  }
}
```

### `DELETE /short-urls/:shortUrlCode`

Remove logicamente um link curto do usuário autenticado.

Headers:

```text
Authorization: Bearer <jwt>
```

Resposta `200`:

```json
{
  "message": "Shortened URL successfully deleted."
}
```

## Redirects públicos

### `GET /:shortUrlCode`

Redirect clássico pelo código curto.

Comportamento:

- se o link não tiver enrichment de alto risco, responde `302`;
- se o link tiver enrichment com `riskLevel=high`, responde `200 text/html` com uma página de alerta;
- para confirmar mesmo assim, use `?proceed=1`, `?proceed=true` ou `?proceed=yes`.

Exemplos:

- `/abc12345`
- `/abc12345?proceed=1`

### `GET /:username/:alternativeSlug`

Redirect humanizado baseado no usuário dono da URL e no `alternativeSlug` gerado pelo enrichment.

Comportamento:

- resolve `username` no service `identity`;
- busca a URL do usuário com o `alternativeSlug`;
- aplica a mesma regra de alerta para `riskLevel=high`.

Exemplos:

- `/jane-doe/openai-docs`
- `/jane-doe/openai-docs?proceed=1`

## Página de alerta para links de alto risco

Quando o enrichment tiver:

```json
{
  "status": "completed",
  "riskLevel": "high"
}
```

o sistema não redireciona automaticamente.

Em vez disso:

- mostra uma página HTML avisando do risco;
- exibe o destino original;
- tenta exibir categoria e resumo, quando existirem;
- oferece as ações `Voltar` e `Continuar`.

O clique só é contabilizado quando o usuário realmente confirma o redirect.

## Contratos internos via TCP

Esses contratos não são rotas HTTP públicas, mas fazem parte do comportamento do sistema.

### `validate_user_token`

Chamado pelo `short-url` para validar JWT.

Payload:

```json
{
  "token": "jwt-token"
}
```

Resposta de sucesso:

```json
{
  "isSuccess": true,
  "value": {
    "userId": "uuid",
    "email": "user@example.com",
    "username": "jane-doe"
  }
}
```

Resposta de falha típica:

```json
{
  "isSuccess": false,
  "error": {
    "status": 401,
    "message": "User not found or inactive!"
  }
}
```

### `find_user_by_username`

Chamado pela rota humanizada para resolver `username -> userId`.

Payload:

```json
{
  "username": "jane-doe"
}
```

Resposta de sucesso:

```json
{
  "isSuccess": true,
  "value": {
    "userId": "uuid",
    "username": "jane-doe"
  }
}
```

Resposta de falha típica:

```json
{
  "isSuccess": false,
  "error": {
    "status": 404,
    "message": "User not found or inactive!"
  }
}
```
