# Firebase — publicar catálogo TNJ 3D

Guia para publicar o catálogo no **Firebase Hosting**.

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

---

## Passo 2 — Gerar o token (Cloud Shell ou terminal)

### ⚠️ Comando correto

O pacote npm se chama **`firebase-tools`**, não `firebase`. Use um destes:

```bash
# Opção A — direto (recomendado no Cloud Shell)
npx firebase-tools login:ci

# Opção B — instalar globalmente primeiro
npm install -g firebase-tools
firebase login:ci

# Opção C — dentro do repositório clonado
git clone https://github.com/nicholaspoliceno11/Tnj.catalagos.git
cd Tnj.catalagos
npm install
npm run login:ci
```

> **Não use** `npx firebase login:ci` — isso gera o erro `could not determine executable to run`.

O comando abre o navegador para login. Ao final, copie o **token** exibido no terminal (começa com algo como `1//...`).

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

Se preferir publicar sem GitHub Actions:

```bash
git clone https://github.com/nicholaspoliceno11/Tnj.catalagos.git
cd Tnj.catalagos
npm install
npx firebase-tools login
npx firebase-tools deploy --only hosting --project tnj-3d-catalogo
```

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
| Site Not Found em `.web.app` | Nenhum deploy feito ainda | Gere token + adicione `FIREBASE_TOKEN` no GitHub |
| Deploy falha no GitHub Actions | Secret ausente ou inválido | Recrie o token com `login:ci` e atualize o secret |
