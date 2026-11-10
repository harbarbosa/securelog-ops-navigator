# SecureLog — Plano de backend funcional

## Estado atual
O backend Fastify/TypeScript e o PostgreSQL estão ativos para autenticação, cadastros, leituras e pesquisa. O frontend administrativo consulta esses endpoints e não usa dados fictícios. As integrações externas de NVR e o provisionamento de dispositivos Zebra ainda precisam ser configurados para cada ambiente.

## Arquitetura proposta
- Frontend atual: React 19, TanStack Start, TypeScript.
- API: Node.js/TypeScript, validação de entrada, autenticação por sessão segura, autorização por perfil e local.
- Banco: PostgreSQL, migrações versionadas em `backend/migrations`.
- Processamento assíncrono: fila para consultas de NVR e geração de mídias.
- Conectores de gravadores por fabricante/protocolo; credenciais guardadas em cofre/secret manager, nunca retornadas pela API.
- Coletor Zebra: identificador único por leitura, sincronização idempotente, fila local offline e confirmação por lote.

## Reprodução de gravações Intelbras

Para gravadores Intelbras/Dahua compatíveis, a API pesquisa arquivos pelo `mediaFileFind.cgi` e inicia playback RTSP convertido para HLS pelo FFmpeg. Configure `FFMPEG_PATH` se o executável não estiver no PATH. O frontend abre o HLS em um popup, sem armazenar ou expor a senha do NVR.

Rotas autenticadas:

- `GET /api/media/search?camera_id=...&start=...&end=...`
- `POST /api/media/playback` com `camera_id`, `start` e `end` em ISO-8601.

## Ordem de implementação
1. Configuração da API, ambiente, migrations, healthcheck e testes.
2. Login/logout, recuperação de senha, RBAC, sessões e proteção das rotas existentes.
3. CRUD de usuários, locais, gravadores, câmeras e dispositivos, com desativação quando há vínculos.
4. Recepção e pesquisa paginada de leituras; filtros, exportação e trilha de auditoria.
5. Sincronização Zebra com autenticação por dispositivo, deduplicação e confirmação.
6. Adaptadores NVR, pesquisa de snapshots/vídeos, armazenamento seguro e expiração.
7. Heartbeat, monitoramento, alertas, retenção, observabilidade e testes ponta a ponta.
8. Conclusão das integrações externas e testes ponta a ponta, preservando layout e rotas.

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
