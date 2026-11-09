# SecureLog — Plano de backend funcional

## Estado inicial (09/11/2026)
O frontend React/TanStack existente é um protótipo com dados simulados. Esta branch inicia o backend sem alterar as telas existentes. **Nenhum endpoint, autenticação ou integração real está ativo apenas por adicionar esta documentação e migração.**

## Arquitetura proposta
- Frontend atual: React 19, TanStack Start, TypeScript.
- API: Node.js/TypeScript, validação de entrada, autenticação por sessão segura, autorização por perfil e local.
- Banco: PostgreSQL, migrações versionadas em `backend/migrations`.
- Processamento assíncrono: fila para consultas de NVR e geração de mídias.
- Conectores de gravadores por fabricante/protocolo; credenciais guardadas em cofre/secret manager, nunca retornadas pela API.
- Coletor Zebra: identificador único por leitura, sincronização idempotente, fila local offline e confirmação por lote.

## Ordem de implementação
1. Configuração da API, ambiente, migrations, healthcheck e testes.
2. Login/logout, recuperação de senha, RBAC, sessões e proteção das rotas existentes.
3. CRUD de usuários, locais, gravadores, câmeras e dispositivos, com desativação quando há vínculos.
4. Recepção e pesquisa paginada de leituras; filtros, exportação e trilha de auditoria.
5. Sincronização Zebra com autenticação por dispositivo, deduplicação e confirmação.
6. Adaptadores NVR, pesquisa de snapshots/vídeos, armazenamento seguro e expiração.
7. Heartbeat, monitoramento, alertas, retenção, observabilidade e testes ponta a ponta.
8. Substituição gradual dos mocks das telas atuais, preservando layout e rotas.

## Critérios mínimos
- Nenhum login por senha fictícia.
- Toda rota sensível exige sessão e autorização.
- Senhas com hash resistente (Argon2id recomendado), rate limiting e logs sem segredos.
- IDs de eventos por dispositivo impedem leituras duplicadas em reenvios.
- URLs de mídia temporárias e autorização por local.
- Exclusões com dependências devem ser bloqueadas ou convertidas em desativação.
- Migrações, backups e restauração testados antes da produção.

## Decisões pendentes
- Hospedagem e domínio da API; acesso ao PostgreSQL.
- Modelos e protocolos dos NVRs, disponibilidade de SDK/API e acesso de rede.
- Modelo Zebra, versão Android, método de leitura e requisitos offline.
- Política de retenção e volume de leituras/mídias.

## Migração inicial
`backend/migrations/001_initial.sql` define entidades básicas. Deve ser aplicada somente após revisão, em um PostgreSQL de desenvolvimento. Não contém usuários ou senhas padrão.
