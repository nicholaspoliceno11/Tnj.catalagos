# TNJ Catálogos

Dashboard estático para apresentar um catálogo de itens para venda da empresa.
O projeto foi feito sem dependências, então pode ser publicado facilmente como
GitHub Pages, Netlify, Vercel ou qualquer hospedagem de arquivos estáticos.

## Arquivos principais

- `index.html`: estrutura da página e textos principais.
- `styles.css`: aparência visual e responsividade.
- `script.js`: lista de produtos, filtros, busca e links de contato.
- `assets/`: pasta para imagens da empresa.

## Como adicionar a logo e o infográfico

Coloque os arquivos dentro da pasta `assets/` com estes nomes:

- `assets/logo.png`
- `assets/infografico.png`

Se os arquivos ainda não existirem, a página exibe placeholders automáticos.
Você também pode usar `.jpg`, `.webp` ou `.svg`, mas nesse caso atualize o
`src` correspondente em `index.html`.

## Como editar os itens do catálogo

Abra `script.js` e edite a lista `products`. Cada item segue este formato:

```js
{
  name: "Nome do item",
  category: "Categoria",
  code: "COD-001",
  description: "Descrição curta para o cliente.",
  price: "Sob consulta",
  highlight: "Destaque",
  initials: "NI",
}
```

## Como atualizar o contato

Troque os dados de WhatsApp e e-mail em:

- `index.html`, seção `#contato`
- função `buildWhatsAppLink` em `script.js`

Use o número no formato internacional, por exemplo:

```txt
https://wa.me/5511999999999
```

## Como publicar como link no GitHub Pages

1. Envie os arquivos para o GitHub.
2. No repositório, acesse **Settings > Pages**.
3. Em **Build and deployment**, selecione a branch desejada e a pasta `/root`.
4. Salve e aguarde o GitHub gerar o link público.
