# SecureLog — teste local do fluxo Zebra

## Pré-requisitos
Node.js 22+, Docker com Compose, backend/.env configurado e PostgreSQL local.

```bash
cd backend
docker compose up -d
npm install
npm run typecheck
npm test
npm run migrate
npm run seed:admin
npm run dev
```

## Preparação no painel
1. Entre com a conta administradora.
2. Cadastre um gravador (NVR).
3. Cadastre uma câmera e selecione o gravador e canal.
4. Cadastre um local e selecione a câmera principal.
5. Cadastre um coletor Zebra e selecione o local.
6. Copie o UUID do coletor (na API ou banco).

## Emitir token de dispositivo
Execute no diretório backend:

```bash
npm run device:token -- <UUID_DO_COLETOR>
```

**Atenção:** o comando exibe o token somente uma vez. Guarde-o em armazenamento seguro. Uma nova execução substitui o token anterior, revogando-o. Não coloque o token no Git, em logs nem no frontend.

## Enviar leitura
Exemplo com cURL (substitua os valores):

```bash
curl -i -X POST http://127.0.0.1:3333/api/device/readings \
 -H 'Authorization: Bearer TOKEN_DO_COLETOR' \
 -H 'Content-Type: application/json' \
 -d '{"device_event_id":"zebra-evento-001","code":"7891234567890","occurred_at":"2026-11-09T14:00:00-03:00"}'
```

Resposta esperada na primeira inserção: HTTP 201 com `id`, `duplicate:false` e `camera_id`. Reenvie a mesma carga: resposta com `duplicate:true`, sem duplicar o registro.

## Verificações de segurança
- Sem bearer token: HTTP 401.
- Token revogado ou coletor desativado: HTTP 401.
- Local desativado: coletor não autorizado.
- Mesmo device_event_id com código diferente: HTTP 409.
- Pesquisa no painel: somente locais autorizados ao usuário, exceto administrador.
- Se câmera ou gravador estiver inativo: a leitura continua registrada, mas sem camera_id.

## Limites atuais
- Não há sincronização offline do aplicativo Zebra implementada.
- Não há autenticação/streaming de imagens dos NVRs.
- O fluxo acima descreve testes a executar; não constitui evidência de execução bem-sucedida.
- Verifique CORS_ORIGIN e a URL da API conforme as origens efetivas do frontend.
