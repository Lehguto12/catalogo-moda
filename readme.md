# Catálogo online para lojas de roupas (modelo base)

Site estático (HTML, CSS e JavaScript puros) que lê os produtos de uma planilha do Google Sheets. O cliente vê as fotos e os tamanhos disponíveis, monta o carrinho e fecha o pedido pelo WhatsApp com uma mensagem pronta. Não tem backend nem pagamento online.

**Para cada loja nova, só o `config.js` e a planilha mudam.**

## Estrutura

```
catalogo-roupas/
├── index.html        vitrine: busca, filtros e cards
├── produto.html      página do produto (aberta por produto.html?id=ID)
├── carrinho.html     carrinho e finalização no WhatsApp
├── style.css
├── script.js
├── config.js         <- único arquivo de código que muda por loja
├── img/              fotos dos produtos (opcional, veja o passo 5)
└── data/produtos-exemplo.csv   usado enquanto urlPlanilhaCSV estiver vazio
```

## Passo a passo para uma loja nova

### 1. Copiar o projeto
Copie a pasta inteira para uma pasta nova com o nome da loja (ex.: `catalogo-modamaria`).

### 2. Criar a planilha no Google Sheets
Crie uma planilha na conta Google **da loja** e use estas colunas na linha 1, nesta ordem, com um produto por linha:

| Coluna | O que colocar |
|---|---|
| `ID` | Número ou código único por produto (1, 2, 3...). Não repita. |
| `Nome` | Nome que aparece no catálogo. |
| `Categoria` | Feminino, Masculino ou Infantil (vira filtro). |
| `Tipo` | camiseta, calça, vestido... (vira filtro). |
| `Preço` | `59,90`, `59.90` ou `1.299,90`. |
| `Preço_Promocional` | Deixe vazio se não há promoção. Só vale se for menor que o preço. |
| `Imagem_URL` | Uma ou mais fotos separadas por `\|`. Ex.: `img/camiseta1.jpg\|img/camiseta2.jpg`. Também aceita links de compartilhamento do Google Drive (veja o passo 5). |
| `Descrição` | Texto curto. |
| `Tamanhos` | **Todos** os tamanhos que o modelo trabalha. Ex.: `P,M,G,GG` |
| `Disponiveis` | **Só** os que estão em estoque. Ex.: `M,G` |
| `Ultimas_Unidades` | `SIM` mostra o selo "Últimas unidades". |
| `Destaque` | `SIM` mostra o selo "Destaque". |
| `Ativo` | `NÃO` esconde o produto (célula vazia conta como ativo). |

Regras que o site aplica:
- Tamanho que está em `Tamanhos` mas não em `Disponiveis` aparece riscado e não pode ser escolhido.
- `Disponiveis` vazio mostra o produto como **Esgotado**.
- Acento, maiúsculas e minúsculas nos nomes das colunas não importam.

### 3. Publicar a planilha como CSV
1. Na planilha, abra **Arquivo > Compartilhar > Publicar na Web** (em inglês: *File > Share > Publish to web*).
2. Na aba **Link**, troque "Documento inteiro" pela aba dos produtos.
3. Troque o formato "Página da Web" por **Valores separados por vírgula (.csv)**.
4. Deixe marcada a opção de **republicar automaticamente quando houver alterações**.
5. Clique em **Publicar** e copie o link. Ele termina com `output=csv`.

Atenção:
- Quem tiver esse link consegue ler a aba publicada. **Não coloque dados privados** (custo, fornecedor, telefone de cliente) nessa aba.
- Depois de editar a planilha, a atualização no site pode levar alguns minutos.
- Para parar de publicar: **Arquivo > Compartilhar > Publicar na Web > Conteúdo publicado e configurações > Interromper publicação**.

### 4. Editar o `config.js`

```js
const CONFIG = {
  nomeLoja: "Nome da Loja",
  slogan: "Frase curta da loja",
  whatsapp: "5511999999999",     // 55 + DDD + número, só dígitos
  urlPlanilhaCSV: "COLE_AQUI_O_LINK_DO_PASSO_3",
  cores: { fundo: "#f4f5f3", texto: "#1f2a37", principal: "#1f2a37", destaque: "#2f6f5e" },
  mensagemAviso: "Disponibilidade sujeita a confirmação pela loja."
};
```

Escolha cores com bom contraste entre `fundo` e `texto`, e entre `destaque` e branco (o selo "Últimas unidades" usa texto branco sobre `destaque`).

Opcional: troque o texto de `<meta name="description">` no `index.html` e no `produto.html` pela descrição da loja (é o que aparece no Google).

### 5. Fotos
Três opções:
- **Na pasta `img/` do projeto.** Use caminhos como `img/camiseta1.jpg` na coluna `Imagem_URL`. Prefira JPG ou WebP com no máximo 1200 px de largura e uns 200 KB cada, para o site abrir rápido no celular.
- **No Google Drive (o lojista cuida das fotos sozinho).**
  1. Envie as fotos em **JPG ou PNG** para uma pasta do Drive. Fotos HEIC (iPhone) não aparecem.
  2. Compartilhe a pasta (ou cada foto) com o acesso **"Qualquer pessoa com o link"**. Para conferir, abra o link de uma foto em uma janela anônima: ela precisa abrir sem pedir login.
  3. Em cada foto, clique com o botão direito, escolha **Compartilhar > Copiar link**.
  4. Cole o link na coluna `Imagem_URL`. Para mais de uma foto, separe os links com `|`. O site converte o link sozinho para o formato de imagem (função `urlDaImagem()` no `script.js`).

  Cuidados: o link tem que ser **de cada arquivo**, não da pasta. O Drive não é um serviço feito para hospedar imagem de site e esse formato não é garantido pelo Google, então **teste com fotos reais antes de entregar** e avise o lojista. Se um dia o Google mudar o formato, o ajuste fica só na função `urlDaImagem()`.
- **Em um endereço público na internet.** Cole a URL completa (`https://...`).

Para as fotos da pasta `img/`, use sempre **minúsculas, sem espaço e sem acento** nos nomes dos arquivos. No computador com Windows `Camiseta.JPG` e `camiseta.jpg` funcionam como o mesmo arquivo, mas no servidor são arquivos diferentes e a foto some.

Se uma foto não carregar, o site mostra a inicial do nome do produto no lugar, e o catálogo continua funcionando.

### 6. Testar no computador
Abra a pasta no VS Code e rode **Live Server** (endereço `http://127.0.0.1:5500`). Não abra o `index.html` direto do disco: o navegador bloqueia a leitura do CSV nesse modo.

Confira: produtos aparecem, filtros funcionam, tamanho esgotado fica riscado, carrinho soma certo e o botão "Finalizar no WhatsApp" abre a conversa com o número da loja.

### 7. Subir no GitHub
Crie um repositório (por exemplo em `repo.new`) e envie a pasta, com a branch `main`:

```bash
git init
git add .
git commit -m "Catálogo da loja"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPO.git
git push -u origin main
```

### 8. Publicar na Cloudflare Pages
1. No painel da Cloudflare, vá em **Workers & Pages**, clique em **Create application**, abra a aba **Pages** e escolha **Import an existing Git repository** (ou **Connect to Git**).
2. Escolha o GitHub, autorize e selecione o repositório da loja. Clique em **Begin setup**.
3. Configure:
   - **Production branch:** `main`
   - **Framework preset:** nenhum
   - **Build command:** deixe vazio. Se o painel exigir um valor, use `exit 0` (não faz nada).
   - **Build output directory:** a pasta onde está o `index.html`. Como ele fica na raiz do repositório, use a raiz (se o campo pedir um valor, `/`).
4. Clique em **Save and Deploy**. Ao terminar, o painel mostra o endereço, normalmente `NOME-DO-PROJETO.pages.dev`.
5. Abra o endereço no celular e repita os testes do passo 6.

Se o endereço der erro 404, confira se o `index.html` está na raiz do repositório e se esse é o diretório configurado como saída.

A partir daí, cada `git push` na branch `main` publica a nova versão sozinho. Domínio próprio é opcional e é configurado no mesmo projeto da Cloudflare.

## Rotina do lojista
O lojista só edita a planilha: ajusta `Disponiveis` quando um tamanho acaba, marca `Ultimas_Unidades`, troca preços, põe `NÃO` em `Ativo` para esconder um produto. O site lê a planilha a cada visita, sem precisar publicar nada de novo. Edite no Google Sheets (ou no VS Code, se for o CSV de exemplo). **Não abra nem salve o CSV pelo Excel**: ele muda o separador e a codificação.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Página em branco ou "Não foi possível carregar os produtos" no computador | Abriu o arquivo direto do disco. Use o Live Server. |
| A mesma mensagem no site publicado | Link do CSV errado ou planilha não publicada. Abra o link do `config.js` no navegador: deve baixar ou mostrar o CSV. |
| Mudei a planilha e o site não mudou | A publicação do Google leva alguns minutos. Espere e recarregue. |
| Produto não aparece | `Ativo` está como `NÃO`, ou falta `ID` ou `Nome`. |
| Tamanho que existe não pode ser escolhido | Não está escrito em `Disponiveis`. Confira vírgulas e espaços. |
| Foto some só no site publicado | Nome do arquivo com maiúscula ou acento diferente do que está na planilha. |
| Foto do Drive mostra só a inicial do produto | Acesso não está como "Qualquer pessoa com o link", o link é de pasta (e não do arquivo), a foto é HEIC, ou o Google mudou o formato. Abra o link em janela anônima para testar. |
| WhatsApp abre sem o contato certo | `whatsapp` fora do formato `55` + DDD + número, só dígitos. |
| Item no carrinho com aviso "Indisponível" | O estoque mudou depois que o cliente adicionou. Ele precisa remover o item para finalizar. |

## Limitações conhecidas
- A planilha não tem quantidade em estoque, só os tamanhos disponíveis. Por isso o carrinho aceita de 1 a 99 unidades por item e a loja confirma a disponibilidade pelo WhatsApp.
- O carrinho fica no navegador do cliente (localStorage): não acompanha o cliente em outro aparelho.
- Não há pagamento online. O pedido é só uma mensagem para a loja.
- Fotos pelo Google Drive funcionam hoje, mas dependem de um formato de link que o Google não garante. Para clientes que não possam correr esse risco, use a pasta `img/` do projeto.

## Checklist de entrega ao cliente
- [ ] Planilha na conta Google da loja, só com a aba de produtos publicada
- [ ] `config.js` com nome, slogan, WhatsApp, link do CSV e cores
- [ ] Fotos leves e com nomes em minúsculas
- [ ] Testado no celular: filtros, carrinho e mensagem do WhatsApp
- [ ] Item esgotado e produto inativo testados (aviso aparece no carrinho)
- [ ] Endereço do site e link da planilha entregues ao lojista

## Fontes consultadas para o passo a passo
- Cloudflare Pages, site estático: https://developers.cloudflare.com/pages/framework-guides/deploy-anything/
- Cloudflare Pages, integração com Git: https://developers.cloudflare.com/pages/get-started/git-integration/
- Google Sheets, publicar na web: https://support.google.com/docs/answer/183965
- Passo a passo de publicação em CSV: https://afosto.com/docs/tutorial-publish-csv-online-from-google-sheets/

As telas da Cloudflare e do Google mudam com frequência. Se algum nome de menu estiver diferente, siga a documentação oficial acima.