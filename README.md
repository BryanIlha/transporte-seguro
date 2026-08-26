# 01 Transportes

Site institucional da 01 Transportes, com informações sobre transporte escolar, locação e venda de vans, micro-ônibus e ônibus.

## Desenvolvimento

Requisitos: Node.js 20+ e Bun 1.2+.

```sh
bun install
bun run dev
```

Para gerar a versão de produção:

```sh
bun run build
```

## Catálogo e administração

O catálogo público é exibido na página inicial. A área protegida para cadastrar e editar a frota fica em `/admin`.

### Configurar o ambiente

1. Copie o arquivo de exemplo e preencha a URL e a publishable key do projeto Supabase, disponíveis em **Project Settings → API**:

```sh
cp .env.example .env.local
```

2. Aplique as migrações em `supabase/migrations/` no projeto Supabase conectado. Elas criam tabelas exclusivas do catálogo, regras de acesso, o bucket privado de fotos `catalog-vehicle-images` e o bucket privado de documentos `catalog-vehicle-documents`.

3. Crie o primeiro usuário em **Authentication → Users** no Supabase. Depois, no SQL Editor, autorize-o substituindo o e-mail:

```sql
insert into public.catalog_admins (user_id)
select id
from auth.users
where email = 'admin@exemplo.com';
```

Somente contas registradas em `catalog_admins` podem entrar em `/admin`, enviar fotos, publicar veículos ou alterar o catálogo. Não há cadastro público de administradores.

Veículos marcados como **Publicar no site** substituem os exemplos temporários da página inicial. Cada novo cadastro exige um CRLV em PDF: o documento é lido no navegador, placa/RENAVAM/chassi são conferidos e o arquivo original fica armazenado em `catalog_vehicle_documents` para auditoria. O fluxo de leitura segue o mesmo parser usado no `routeradar-command-center`; PDFs sem texto suficiente ficam marcados como **revisar** para conferência manual.

## Stack

- TanStack Start
- TypeScript
- React
- Tailwind CSS
- Supabase Auth, Postgres e Storage
