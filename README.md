# 01 Transportes

Site institucional e catálogo de veículos da 01 Transportes.

## Desenvolvimento

Requisitos: Node.js 22+.

```sh
npm install
npm run dev
```

Para validar o site e a API:

```sh
npm run lint
npm run build
npm test
npm test --workspace @transporte-seguro/api
```

## Arquitetura do catálogo

O site TanStack Start (`transporte-seguro-web`) consome a API Fastify (`transporte-seguro-api`) por `/api`. A API usa um Postgres dedicado (`transporte-seguro-db`) e volume persistente em `/data`.

O catálogo começa vazio. O painel protegido está em `/admin` e permite cadastrar, editar, publicar e excluir veículos definitivamente. Fotos são públicas apenas por endpoint controlado; CRLVs ficam privados e exigem sessão de administrador.

O CRLV é opcional. Quando anexado, o parser existente extrai dados, o administrador confirma os identificadores e a API registra hash/fingerprint para evitar duplicidade.

## Configuração do backend

Use `.env.example` como referência. No serviço da API, configure:

- `DATABASE_URL`
- `EXPECTED_DATABASE_NAME`
- `PROJECT_KEY=transporte-seguro`
- `SESSION_SECRET` com valor aleatório longo
- `FILE_ROOT=/data`
- `WEB_ORIGIN`

No serviço web, configure:

- `BACKEND_INTERNAL_URL` apontando para o serviço privado da API
- `VITE_WHATSAPP_NUMBER` com o número real em formato internacional

O processo da API executa o preflight de identidade e a migration antes de iniciar. Se o banco conectado não corresponder ao nome esperado ou não tiver a identidade `transporte-seguro`, o processo encerra sem alterar dados.

## Primeiro administrador

Depois de o serviço estar conectado ao Postgres correto, execute no terminal privado da API:

```sh
npm run admin:create --workspace @transporte-seguro/api
```

Para remover uma conta temporária de teste:

```sh
npm run admin:delete --workspace @transporte-seguro/api
```

Não existe cadastro público de administradores.

## Coolify e backups

No projeto `Transporte Seguro`, mantenha os recursos web, API e Postgres separados. Monte o volume persistente da API em `/data`, configure backup diário do banco e dos arquivos com retenção de 14 dias/4 semanas e valide uma restauração antes do corte.

As migrations em `supabase/` são legado histórico e não devem ser aplicadas. O 01 Capital possui infraestrutura separada; nenhuma credencial ou migration desse projeto deve ser reutilizada aqui.
