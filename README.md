# TNJ — Catálogo de Produtos

Dashboard de catálogo digital para apresentar itens à venda da empresa. Layout responsivo, busca, filtros por categoria e botão de orçamento via WhatsApp.

## Link público

**GitHub Pages** (atual):

**https://nicholaspoliceno11.github.io/Tnj.catalagos/**

> ⚠️ Use **catalagos** (com **a**), não `catalogos`.

### Firebase Hosting + domínio `tnj3d.impressoes`

Para publicar com domínio próprio (ex.: `tnj3d.impressoes.com.br`), siga o guia:

👉 **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)**

Resumo:
1. Criar projeto em [Firebase Console](https://console.firebase.google.com)
2. Copiar `.firebaserc.example` → `.firebaserc` (já vem com `tnj-3d-catalogo`)
3. Adicionar secret `FIREBASE_TOKEN` no GitHub
4. Configurar domínio personalizado no Firebase Hosting

### Publicar no GitHub Pages (primeira vez)

1. Abra [Settings → Pages](https://github.com/nicholaspoliceno11/Tnj.catalagos/settings/pages)
2. Em **Source**, selecione **GitHub Actions**
3. Aguarde o workflow **Deploy GitHub Pages** concluir em [Actions](https://github.com/nicholaspoliceno11/Tnj.catalagos/actions)
4. Acesse o link acima (pode levar 1–2 minutos após o deploy)

## Como personalizar

### 1. Logo e infográfico

Coloque os arquivos na pasta `assets/`:

| Arquivo | Uso |
|---------|-----|
| `assets/logo.png` | Logo no cabeçalho e favicon |
| `assets/infografico.png` | Imagem de destaque na página inicial |

> Enquanto a logo não for adicionada, o site exibe o nome **TNJ** como fallback.

## Personalizar produtos

### Painel administrador

Acesse **/admin.html** para gerenciar o catálogo:

- Login com e-mail e senha do administrador
- Editar preços, descrições e benefícios
- Adicionar e excluir produtos
- Publicar alterações no site

### Publicar alterações para todos os visitantes

1. Faça login em `admin.html`
2. Vá em **Configurações** e adicione um [GitHub Personal Access Token](https://github.com/settings/tokens) com permissão de escrita no repositório
3. Clique em **Publicar catálogo**

Sem token, o sistema baixa o arquivo `catalog.json` para você enviar manualmente.

Os dados ficam em `data/catalog.json`.

## Visualizar localmente

```bash
python3 -m http.server 8080
```

Abra `http://localhost:8080`.

## Publicar

1. Faça merge do PR na branch `main`
2. Em **Settings → Pages**, selecione **GitHub Actions** como fonte
3. O workflow `.github/workflows/pages.yml` publica automaticamente a cada push em `main`

## Estrutura

```
├── index.html          # Página principal
├── css/styles.css      # Estilos
├── data/catalog.json   # Dados do catálogo (produtos e empresa)
├── admin.html          # Painel administrador
├── js/
│   ├── app.js          # Lógica do catálogo público
│   ├── admin.js        # Painel admin
│   ├── auth.js         # Autenticação admin
│   └── catalog-store.js
└── assets/             # Logo, infográfico e fotos dos produtos
```
