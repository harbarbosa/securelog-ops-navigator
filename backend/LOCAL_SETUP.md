# Execução local da API SecureLog

Requisitos: Node.js 22+, npm e Docker com Docker Compose.

```bash
git clone https://github.com/harbarbosa/securelog-ops-navigator.git
cd securelog-ops-navigator
git checkout feat/backend-securelog
cd backend
cp .env.example .env
# Edite .env e defina ADMIN_PASSWORD com uma senha forte (mínimo 12 caracteres)
docker compose up -d
npm install
npm run migrate
npm run seed:admin
npm run dev
```

No Windows PowerShell, substitua `cp .env.example .env` por `Copy-Item .env.example .env`.

Verifique `http://127.0.0.1:3333/api/health`. O endpoint deve responder com `status: ok` após o banco estar acessível.

### Endpoints implementados nesta etapa
- `GET /api/health`: teste da API e conexão com PostgreSQL
- `POST /api/auth/login`: autenticação por usuário e senha; cookie de sessão HTTP-only
- `GET /api/auth/me`: sessão atual
- `POST /api/auth/logout`: revogação de sessão
- `GET /api/locations`, `/api/recorders`, `/api/cameras`, `/api/devices`, `/api/users`: listagens paginadas
- `GET /api/readings?code=...`: leituras paginadas
- `POST /api/readings`: inserção idempotente de leitura autenticada

### Limitações e bloqueios antes da produção
Este é um **backend inicial, não um sistema completo**. Ainda faltam CRUD, integração do frontend, sincronização segura por dispositivo, autorização por local em todas as consultas, proteção CSRF para sessões por cookie, testes automatizados e integrações NVR/Zebra. Não exponha a API à internet antes dessas etapas. O servidor usa 127.0.0.1 por padrão.

### Teste manual
```bash
curl http://127.0.0.1:3333/api/health
curl -i -c cookies.txt -H "Content-Type: application/json" -d '{"username":"admin","password":"SENHA_CONFIGURADA_NO_ENV"}' http://127.0.0.1:3333/api/auth/login
curl -b cookies.txt http://127.0.0.1:3333/api/auth/me
```

**Não envie o arquivo .env nem cookies.txt ao GitHub.**
