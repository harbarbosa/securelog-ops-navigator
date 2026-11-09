# Securelog Ops Navigator

Crie somente a interface gráfica e o protótipo navegável do sistema SecureLog.

Não implemente backend, banco de dados, autenticação real, integração com NVR, leitores Zebra, n8n ou APIs. Use dados fictícios/mockados e estados locais apenas para demonstrar a navegação e os fluxos da interface.

O sistema terá duas interfaces:

1. Painel web administrativo
2. Aplicativo mobile para coletor Zebra

## Identidade visual

Criar uma interface profissional, limpa e objetiva, com aparência de sistema corporativo de operação e segurança.

Evitar aparência genérica de inteligência artificial.

Estilo:

- Baseado em dashboard administrativo moderno.
- Referência visual: Apex Dashboard, com layout limpo.
- Fundo claro em cinza muito suave.
- Menu lateral fixo no desktop.
- Cabeçalho compacto.
- Cards discretos.
- Bordas arredondadas moderadas.
- Sombras suaves.
- Azul escuro, azul médio e verde para status positivo.
- Vermelho somente para alertas.
- Tipografia legível.
- Boa visualização em telas grandes e tablets.
- Interface responsiva.
- Textos em português do Brasil.
- Datas no formato `dd/mm/aaaa HH:mm:ss`.

## Estrutura do painel web

Criar um layout principal com:

- Menu lateral.
- Logo ou nome SecureLog.
- Nome do usuário logado.
- Indicador de ambiente.
- Botão para sair.
- Breadcrumb ou título da página.
- Área principal de conteúdo.
- Sistema de notificações visuais.

Menu lateral:

- Visão geral
- Leituras
- Pesquisar código
- Locais
- Usuários
- Configurações
  - Gravadores
  - Câmeras
  - Dispositivos
  - Monitoramento
  - Retenção de mídia

## Tela 1 — Login

Criar uma tela de login profissional contendo:

- Logo SecureLog.
- Campo usuário ou e-mail.
- Campo senha.
- Checkbox “Lembrar acesso”.
- Botão “Entrar”.
- Link “Esqueci minha senha”.
- Mensagem de erro simulada.
- Fundo discreto relacionado a monitoramento e segurança.
- Layout centralizado e responsivo.

## Tela 2 — Visão geral

Criar um dashboard com:

Cards principais:

- Leituras realizadas hoje.
- Códigos únicos.
- Dispositivos ativos.
- Câmeras conectadas.
- Gravadores online.
- Leituras pendentes de sincronização.

Criar uma área de status operacional:

- Servidor online.
- Banco de dados online.
- Leitores conectados.
- Gravadores conectados.
- Último heartbeat enviado.
- Próxima verificação prevista.

Criar tabela “Últimas leituras” com:

- Código.
- Data e hora.
- Usuário.
- Local.
- Dispositivo.
- Câmera.
- Status.
- Botão “Consultar”.

Criar uma área de alertas recentes:

- Leitor offline.
- Gravador sem comunicação.
- Leituras pendentes.
- Falha de sincronização.

Usar dados mockados realistas.

## Tela 3 — Leituras

Criar uma tela de gerenciamento de leituras com:

Filtros:

- Código.
- Data inicial.
- Data final.
- Usuário.
- Local.
- Dispositivo.
- Câmera.
- Status de sincronização.

Botões:

- Pesquisar.
- Limpar filtros.
- Exportar.

Tabela com:

- Código lido.
- Data e hora.
- Usuário.
- Local.
- Leitor.
- Câmera.
- Status.
- Ações.

Ações:

- Ver detalhes.
- Pesquisar imagem.
- Pesquisar vídeo.
- Ver histórico.

Criar paginação visual moderna com:

- Primeira página.
- Anterior.
- Número das páginas.
- Próxima.
- Última página.

## Tela 4 — Detalhes da leitura

Criar uma tela ou painel lateral com:

- Código.
- Data e hora.
- Usuário.
- Local.
- Dispositivo.
- Câmera associada.
- Gravador.
- Status da sincronização.
- Identificador da leitura.

Área de mídia:

- Placeholder para snapshot.
- Botão “Buscar imagem”.
- Botão “Buscar vídeo”.
- Campo de data/hora inicial.
- Campo de data/hora final.
- Player de vídeo simulado.
- Botão “Baixar trecho”.

Exibir estados:

- Imagem disponível.
- Imagem indisponível.
- Consultando gravador.
- Vídeo encontrado.
- Falha na consulta.

## Tela 5 — Pesquisar código

Criar uma tela simples e objetiva para pesquisa operacional.

Elementos:

- Campo grande para digitar ou colar o código.
- Botão “Pesquisar no gravador”.
- Sugestão de códigos recentes.
- Resultado da última leitura encontrada.
- Data e hora do evento.
- Local.
- Câmera.
- Gravador.
- Período consultado.
- Snapshot simulado.
- Player de vídeo simulado.
- Botão para baixar trecho.

Criar estados vazios e mensagens de erro amigáveis.

## Tela 6 — Locais

Criar uma tela de cadastro de locais.

Tabela:

- Nome do local.
- Descrição.
- Câmera associada.
- Gravador.
- Quantidade de dispositivos.
- Status.
- Última atividade.

Ações:

- Novo local.
- Editar.
- Ativar/desativar.
- Ver detalhes.

Formulário:

- Nome.
- Descrição.
- Câmera principal.
- Gravador relacionado.
- Status.

## Tela 7 — Usuários

Criar tela de gerenciamento de usuários.

Tabela:

- Nome.
- Usuário.
- Perfil.
- Locais permitidos.
- Último acesso.
- Status.

Perfis simulados:

- Administrador.
- Supervisor.
- Operador.
- Consulta.

Formulário:

- Nome.
- E-mail ou usuário.
- Perfil.
- Status.
- Locais permitidos.
- Permissão para consultar vídeos.
- Permissão para administrar cadastros.

## Tela 8 — Gravadores

Criar tela de cadastro de NVR/DVR.

Tabela:

- Nome.
- Endereço.
- Modelo.
- Quantidade de câmeras.
- Status da conexão.
- Última comunicação.

Formulário:

- Nome.
- Endereço interno.
- Porta.
- Usuário.
- Senha.
- Tipo de gravador.
- Status.

Criar botão “Testar conexão” com resultado simulado:

- Conectado.
- Falha de autenticação.
- Sem comunicação.

## Tela 9 — Câmeras

Criar tela de cadastro de câmeras.

Tabela:

- Nome.
- Local.
- Gravador.
- Canal.
- Tipo.
- Status.

Formulário:

- Nome.
- Local.
- Gravador.
- Canal.
- Descrição.
- Status.

Criar preview visual simulado da câmera.

## Tela 10 — Dispositivos e leitores

Criar tela de cadastro dos leitores Zebra.

Tabela:

- Nome do leitor.
- Código ou número de série.
- Local atual.
- Usuário vinculado.
- Última comunicação.
- Leituras pendentes.
- Status.

Formulário:

- Nome.
- Código do dispositivo.
- Número de série.
- Local permitido.
- Status.
- Usuário responsável.

Exibir status:

- Online.
- Offline.
- Sincronizando.
- Com pendências.

## Tela 11 — Monitoramento

Criar uma tela de saúde do sistema com cards para:

- Aplicação.
- PHP.
- MySQL.
- Servidor.
- Leitores.
- Gravadores.
- Câmeras.
- Comunicação com Alfredo/n8n.

Exibir:

- Status atual.
- Última verificação.
- Tempo desde o último contato.
- Próxima verificação.
- Histórico de eventos.

Criar timeline de eventos:

- Heartbeat recebido.
- Leitor desconectado.
- Gravador recuperado.
- Falha de banco.
- Servidor reiniciado.

Adicionar filtro por período e status.

## Tela 12 — Retenção de mídia

Criar tela de configuração para:

- Dias de retenção.
- Espaço utilizado.
- Arquivos temporários.
- Última limpeza.
- Próxima limpeza.
- Quantidade de arquivos removidos.
- Espaço liberado.

Valor padrão visual:

- 7 dias.

Adicionar botão “Executar limpeza agora” com confirmação simulada.

## Aplicativo mobile para o Zebra

Criar uma experiência mobile independente, com navegação simples e botões grandes para uso em operação.

### Tela mobile 1 — Login

- Logo SecureLog.
- Usuário.
- Senha.
- Entrar.
- Mensagem de erro.
- Indicador de conexão.

### Tela mobile 2 — Seleção de local

Após o login, o usuário deve escolher:

- Local de trabalho.
- Leitor utilizado.

Exibir:

- Locais disponíveis.
- Câmera associada ao local.
- Status de conexão.
- Botão “Iniciar operação”.

### Tela mobile 3 — Leitura

Criar tela principal de operação com:

- Nome do usuário.
- Local atual.
- Dispositivo atual.
- Status online/offline.
- Área grande para leitura.
- Último código lido.
- Horário da última leitura.
- Contador de leituras da sessão.
- Botão para finalizar operação.

Simular leitura através de um botão “Simular leitura”.

### Tela mobile 4 — Leituras pendentes

Exibir:

- Quantidade pendente.
- Lista de códigos aguardando sincronização.
- Data e hora.
- Tentativas de envio.
- Status.
- Botão “Sincronizar agora”.

Criar estados:

- Tudo sincronizado.
- Sincronização em andamento.
- Sem conexão.
- Erro ao sincronizar.

### Tela mobile 5 — Perfil e sessão

Exibir:

- Usuário.
- Local selecionado.
- Leitor utilizado.
- Última sincronização.
- Versão do aplicativo.
- Botão trocar local.
- Botão sair.

## Regras de navegação do protótipo

- Todos os menus devem funcionar.
- Botões devem abrir telas, modais ou drawers.
- Formulários devem aceitar dados mockados.
- Criar toasts de sucesso e erro.
- Criar modais de confirmação.
- Usar dados fictícios realistas.
- Não criar endpoints reais.
- Não usar banco de dados.
- Não implementar autenticação real.
- Não implementar integração real com NVR.
- Não implementar sincronização real.
- O objetivo é somente validar a experiência visual e o fluxo com o cliente.

## Resultado esperado

Entregar um protótipo navegável, visualmente profissional e responsivo, que permita ao cliente entender:

- Como o operador utiliza o coletor Zebra.
- Como as leituras são registradas.
- Como o local define a câmera.
- Como funciona o modo offline.
- Como o administrador acompanha o sistema.
- Como uma leitura é pesquisada.
- Como o sistema consulta imagens e vídeos.
- Como o servidor e os equipamentos são monitorados.
```

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1181257b-d895-4517-9c2f-044054b40f0d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
