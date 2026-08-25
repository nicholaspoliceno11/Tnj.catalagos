# Firebase — domínio tnj3d.impressoes

Guia para publicar o catálogo TNJ 3D no **Firebase Hosting** com domínio personalizado.

## Resultado final

| Item | Exemplo |
|------|---------|
| URL Firebase (temporária) | `https://tnj3d.web.app` |
| Domínio personalizado | `https://tnj3d.impressoes.com.br` *(ou o domínio que você registrar)* |

> **Importante:** `tnj3d.impressoes` sozinho não é um domínio válido na internet. Você precisa de um domínio registrado (ex.: `impressoes.com.br`) e criar o subdomínio `tnj3d`.

---

## Passo 1 — Criar projeto no Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Clique em **Adicionar projeto**
3. Nome sugerido: **TNJ 3D Catálogo**
4. Desative o Google Analytics (opcional, para simplificar)
5. Clique em **Criar projeto**

Anote o **ID do projeto** (ex.: `tnj3d-catalogo`).

---

## Passo 2 — Ativar Hosting

1. No menu lateral: **Hosting** → **Começar**
2. Clique em **Avançar** (não precisa instalar SDK no site estático)

---

## Passo 3 — Configurar o repositório

No seu computador (ou peça ajuda para fazer no GitHub):

```bash
# 1. Copie o ID do projeto
cp .firebaserc.example .firebaserc
# Edite .firebaserc e troque SEU-PROJECT-ID-AQUI pelo ID real

# 2. Instale dependências
npm install

# 3. Faça login no Firebase
npx firebase login

# 4. Publique o site
npm run deploy
```

O site ficará em: `https://SEU-PROJECT-ID.web.app`

---

## Passo 4 — Deploy automático pelo GitHub (recomendado)

1. Gere um token CI do Firebase:
   ```bash
   npx firebase login:ci
   ```
   Copie o token gerado.

2. No GitHub, vá em **Settings → Secrets → Actions** do repositório `Tnj.catalagos`

3. Crie o secret: `FIREBASE_TOKEN` = token copiado acima

4. Edite `.firebaserc` no repositório com o ID real do projeto e faça push na `main`

5. O workflow `.github/workflows/firebase-hosting.yml` publica automaticamente

---

## Passo 5 — Domínio personalizado `tnj3d.impressoes`

### Se você já tem um domínio (ex.: impressoes.com.br)

1. Firebase Console → **Hosting** → **Adicionar domínio personalizado**
2. Digite: `tnj3d.impressoes.com.br`
3. O Firebase mostrará registros DNS para adicionar no seu provedor (Registro.br, Hostinger, etc.):

   | Tipo | Nome | Valor |
   |------|------|-------|
   | TXT | tnj3d | (verificação do Firebase) |
   | A | tnj3d | 151.101.1.195 |
   | A | tnj3d | 151.101.65.195 |

4. Aguarde propagação DNS (15 min a 48 h)
5. O Firebase ativa SSL (HTTPS) automaticamente

### Se ainda não tem domínio

Registre um domínio como:
- `impressoes.com.br` → subdomínio `tnj3d.impressoes.com.br`
- `tnj3d.com.br` → domínio direto `tnj3d.com.br`

Sugestão de registradores no Brasil: Registro.br, Hostinger, GoDaddy.

---

## Passo 6 — Apontar o domínio (DNS)

No painel do seu domínio, crie:

```
tnj3d.impressoes.com.br  →  registros A do Firebase (passo 5)
```

Ou, se preferir CNAME (alguns provedores):

```
tnj3d  CNAME  SEU-PROJECT-ID.web.app
```

---

## Comparativo: GitHub Pages vs Firebase

| | GitHub Pages | Firebase Hosting |
|--|--------------|------------------|
| URL atual | `nicholaspoliceno11.github.io/Tnj.catalagos` | `tnj3d.web.app` |
| Domínio próprio | Possível | **Mais fácil** |
| SSL grátis | Sim | Sim |
| Admin publicar fotos | Precisa token GitHub | Pode usar Firebase Storage depois |

Você pode manter os dois ativos durante a transição.

---

## Próximo passo (opcional)

Integrar **Firestore** para o painel admin salvar produtos direto na nuvem, sem token GitHub. Me avise se quiser que eu configure isso.
