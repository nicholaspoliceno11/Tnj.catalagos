# Firebase — publicar catálogo TNJ 3D

> **Não precisa usar Cloud Shell.** Ao clicar em **Publicar catálogo** no admin, o GitHub atualiza o site automaticamente em 1–2 minutos:
>
> **https://nicholaspoliceno11.github.io/Tnj.catalagos/**
>
> O Firebase abaixo é **opcional** (domínio `.web.app`). Só configure se quiser esse endereço também.

Guia para publicar o catálogo no **Firebase Hosting** (opcional).

## ⚠️ Deploy no Cloud Shell (comando correto)

Se aparecer **`Error: No currently active project`**, use **sempre** o `--project`:

```bash
git clone https://github.com/nicholaspoliceno11/Tnj.catalagos.git
cd Tnj.catalagos
git pull
npx firebase-tools deploy --only hosting --project tnj-3d-catalogo --token "COLE_SEU_TOKEN_AQUI"
```

> ⚠️ O nome da pasta é **`Tnj.catalagos`** (com **a**), não `Tnj.catalogos`.

> O token começa com `1//...` — gere com `npx firebase-tools login:ci --no-localhost`

**Não use** só `firebase deploy` sem `--project tnj-3d-catalogo`.

---

## URLs

| Item | Endereço |
|------|----------|
| Firebase (após deploy) | **https://tnj-3d-catalogo.web.app** |
| GitHub Pages (atual) | https://nicholaspoliceno11.github.io/Tnj.catalagos/ |

> O erro **"Site Not Found"** em `tnj-3d-catalogo.web.app` significa que o site **ainda não foi publicado**. Siga os passos abaixo.

---

## Passo 1 — Ativar Hosting no Firebase Console

1. Acesse [Firebase Console → Hosting](https://console.firebase.google.com/project/tnj-3d-catalogo/hosting)
2. Clique em **Começar** (se ainda não ativou)
3. Clique em **Avançar** — não precisa adicionar app Web nem instalar SDK
4. Confirme que o site **`tnj-3d-catalogo`** aparece na lista (é o site padrão do projeto)

---

## Passo 2 — Gerar o token

### ⚠️ Se você está no **Google Cloud Shell** (use `--no-localhost`)

No Cloud Shell o login normal **não funciona** — ao clicar em "Permitir", o navegador tenta abrir `localhost:9005` no seu PC e dá erro **"conexão recusada"**.

**Use este comando:**

```bash
npx firebase-tools login:ci --no-localhost
```

Fluxo:
1. O terminal mostra um **link** — abra no navegador
2. Clique em **Permitir**
3. A página mostra um **código** (não redireciona para localhost)
4. **Copie o código** e cole de volta no terminal do Cloud Shell
5. O terminal exibe o **token** — copie e guarde

---

### Se está no seu computador (Windows/Mac)

```bash
npx firebase-tools login:ci
```

Ou dentro do repositório:

```bash
git clone https://github.com/nicholaspoliceno11/Tnj.catalagos.git
cd Tnj.catalagos
npm install
npm run login:ci
```

> **Não use** `npx firebase login:ci` — gera o erro `could not determine executable to run`.

---

## Passo 3 — Adicionar secret no GitHub

1. Abra [Settings → Secrets → Actions](https://github.com/nicholaspoliceno11/Tnj.catalagos/settings/secrets/actions)
2. Clique em **New repository secret**
3. Nome: `FIREBASE_TOKEN`
4. Valor: cole o token copiado acima
5. Salve

> Só precisa de **um** secret: `FIREBASE_TOKEN`. O ID do projeto já está configurado no workflow.

---

## Passo 4 — Disparar o deploy

Qualquer push na branch `main` dispara o deploy automaticamente.

Para forçar manualmente:
1. Abra [Actions → Deploy Firebase Hosting](https://github.com/nicholaspoliceno11/Tnj.catalagos/actions/workflows/firebase-hosting.yml)
2. Clique em **Run workflow** → **Run workflow**

Aguarde 1–2 minutos e acesse: **https://tnj-3d-catalogo.web.app**

---

## Alternativa — Deploy direto pelo Cloud Shell

```bash
git clone https://github.com/nicholaspoliceno11/Tnj.catalagos.git
cd Tnj.catalagos
npm install
npx firebase-tools deploy --only hosting --project tnj-3d-catalogo --token "COLE_SEU_TOKEN_AQUI"
```

> Substitua `COLE_SEU_TOKEN_AQUI` pelo token real (começa com `1//...`). **Não** use o texto literal `SEU_TOKEN_AQUI`.

> No Cloud Shell, sempre use `--no-localhost` no login.

---

## Domínio personalizado (opcional)

`tnj3d.impressoes` sozinho não é domínio válido. Você precisa registrar um domínio, por exemplo:

- `tnj3d.impressoes.com.br`
- `tnj3d.com.br`

Depois do primeiro deploy:
1. Firebase Console → **Hosting** → **Adicionar domínio personalizado**
2. Configure os registros DNS indicados pelo Firebase
3. Aguarde propagação (15 min a 48 h)

---

## Resumo dos erros comuns

| Erro | Causa | Solução |
|------|-------|---------|
| `could not determine executable to run` | Comando `npx firebase` errado | Use `npx firebase-tools login:ci` |
| `localhost` conexão recusada ao clicar Permitir | Login no Cloud Shell sem `--no-localhost` | Use `npx firebase-tools login:ci --no-localhost` |
| Assertion failed: no site name or target name | Hosting não ativado ou `site` ausente no `firebase.json` | Ative Hosting no Console + atualize o repositório |
| Site Not Found em `.web.app` | Nenhum deploy feito ainda | Gere token + adicione `FIREBASE_TOKEN` no GitHub |
| `No currently active project` | Falta `--project` no deploy | Use `--project tnj-3d-catalogo` no comando |
| Foto cortada / site desatualizado | Firebase com versão antiga | Rode o deploy acima com `git pull` antes |
| Deploy falha no GitHub Actions | Secret ausente ou inválido | Recrie o token com `login:ci` e atualize o secret |
