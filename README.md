# 01 Transportes

Site institucional e catálogo de veículos da 01 Transportes.

## Desenvolvimento

Requisitos: Node.js 22+.

```sh
npm install
npm run dev
```

O catálogo também exige a API e o Postgres dedicado em execução. No desenvolvimento,
o servidor web encaminha `/api` para `http://127.0.0.1:3001` por padrão. Para outro
endereço, inicie com `BACKEND_DEV_URL=http://host:porta npm run dev`.
`BACKEND_INTERNAL_URL`, quando definido, tem prioridade. Em produção ele é obrigatório.

Em outro terminal, com as variáveis do backend configuradas no ambiente, execute:

```sh
npm run dev --workspace @transporte-seguro/api
```

Use apenas o banco dedicado deste projeto e as rotinas de identidade/migration existentes.
Não reutilize as credenciais Supabase legadas. Sem API configurada ou acessível,
`/api` responde com HTTP 503 em JSON e a página oferece nova tentativa e contato;
isso não significa que o estoque esteja vazio.

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

O CRLV é opcional. Quando anexado, a leitura autenticada do PDF na API preenche placa, RENAVAM, chassi, marca, modelo, ano e lotação, sem depender da APIPlacas. Campos já preenchidos pelo administrador são preservados para conferência. A extração usa `/v1/admin/documents/crlv/extract`, não persiste o arquivo antes de salvar e executa em worker isolado com limite de 10 MB, 5 páginas, 15 segundos e duas leituras simultâneas. Ao salvar, a API armazena o documento privado e registra hash/fingerprint para evitar duplicidade.

## Configuração do backend

Use `.env.example` como referência. No serviço da API, configure:

- `DATABASE_URL`
- `EXPECTED_DATABASE_NAME`
- `PROJECT_KEY=transporte-seguro`
- `SESSION_SECRET` com valor aleatório longo
- `FILE_ROOT=/data`
- `WEB_ORIGIN`
- `APIPLACAS_TOKEN` com o token privado da APIPlacas (somente no serviço API; nunca no web)

No serviço web, configure:

- `BACKEND_INTERNAL_URL` apontando para o serviço privado da API
- O WhatsApp público está definido em `src/lib/contact.ts`: `5551996015671`.

O processo da API executa o preflight de identidade e a migration antes de iniciar. Se o banco conectado não corresponder ao nome esperado ou não tiver a identidade `transporte-seguro`, o processo encerra sem alterar dados.

No painel, o botão “Consultar placa” permite uma consulta externa opcional pela APIPlacas para preencher marca, modelo e ano. Importar um CRLV, sair do campo de placa ou salvar um veículo não dispara essa consulta. O resultado solicitado pelo botão é armazenado como enriquecimento auditável e reaproveitado em cache; o CRLV continua sendo a fonte confirmada quando houver divergência. O token é opcional para o restante do catálogo, mas necessário para consultas novas por placa.

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
