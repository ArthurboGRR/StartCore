# StartCore

Guia interativo de estudos do 1º período de Engenharia de Software. O estudante organiza seus **materiais de estudo** (vídeos, artigos e PDFs), acompanha o progresso do período e consulta conceitos na Wikipédia.

## Funcionalidades

| Recurso | Como funciona |
| ------- | ------------- |
| Cadastrar | Formulário em janela (`dialog`) com validação e mensagens junto de cada campo. Aceita vários links e anexos (guarda nome e tamanho). Bloqueia título repetido na mesma disciplina. |
| Listar | Os cards são gerados por JavaScript a partir dos dados salvos. Progresso do período, contadores e atalhos do rodapé se atualizam a cada alteração. |
| Visualizar detalhes | Botão **Ver/Editar** abre a tela de detalhes (`#material-<id>`). O botão voltar do navegador, o recarregar e links diretos funcionam. |
| Editar | Botão **Editar material** reabre o formulário preenchido. Nos detalhes também é possível trocar o status, marcar etapas do checklist, salvar anotações com data e hora e avaliar de 1 a 5 estrelas. |
| Excluir | Pelo card ou pelos detalhes, com confirmação e botão **Desfazer**. |
| Pesquisar | Busca por título, resumo, disciplina, tipo, conceitos e anotações, sem diferenciar acentos nem maiúsculas. |
| Filtrar | Disciplina, status, tipo e dificuldade, combináveis entre si e com a pesquisa. |
| Ordenar | Data de cadastro, título (A–Z e Z–A) e avaliação. A última ordem escolhida é lembrada. |
| Tema | O botão **Modo** alterna entre os temas claro (padrão) e escuro. |

## Persistência (localStorage)

Os materiais são gravados em JSON na chave `startcore:materiais` após cada cadastro, edição, exclusão ou alteração nos detalhes, e recuperados ao abrir a página. Na primeira visita, três materiais de exemplo são carregados. Outras chaves: `startcore:ultimo-acesso` (atalho "Último acessado") e `startcore:ordem` (ordenação escolhida). Dados ilegíveis ou falhas de gravação são tratados sem quebrar a aplicação.

## API pública: Wikipédia

O painel **Conceitos** e a tela de detalhes consomem a API pública da [Wikipédia em português](https://pt.wikipedia.org/w/api.php) (`action=query` com `generator=search`, `prop=extracts|info` e `origin=*`), sem chave de acesso.

- **Painel Conceitos:** busca um conceito e permite **Cadastrar como material**, abrindo o formulário já preenchido com título, resumo e link da Wikipédia. Sem busca, lista os conceitos já salvos nos materiais.
- **Detalhes do material:** busca conceitos e **vincula** o escolhido ao material, que fica gravado no localStorage e pode ser removido depois.

Fluxo: dados externos (API) → escolha do usuário → cadastro/vínculo no sistema → localStorage. A busca tem estados de carregamento, erro (com nova tentativa) e sem resultados, e uma busca ultrapassada é cancelada.

## Estrutura

```
index.html                 página única (painel, detalhes e janelas)
assets/
  css/style.css            estilos (temas claro e escuro, Flexbox, Grid e Media Queries)
  img/                     logotipo e avatar (SVG locais)
  js/
    materiais.js           listas de opções, exemplos, validação, filtro e ordenação (sem DOM)
    armazenamento.js       leitura e gravação no localStorage
    wikipedia.js           cliente da API da Wikipédia
    script.js              interface: eventos, formulários e atualização do DOM
tests/materiais.test.js    testes das regras de negócio
```

## Como executar

Abra o `index.html` no navegador (ou publique com GitHub Pages). Não há dependências nem etapa de build. A busca na Wikipédia exige conexão com a internet.

Para rodar os testes das regras de negócio (Node.js 18 ou superior):

```
node --test
```
