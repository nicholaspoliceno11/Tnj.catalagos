# Integração Gestão TNJ 3D → Catálogo

Conecta o sistema de custos ([Empresa_TNJ.3D](https://nicholaspoliceno11.github.io/Empresa_TNJ.3D/)) ao catálogo público.

## Como funciona

```
Empresa_TNJ.3D  →  Google Sheets  →  Apps Script  →  Catálogo Admin
     (criar projeto)    (planilha)      (API)         (importar inativo)
```

1. Você cria o projeto na **Calculadora** do Empresa_TNJ.3D (botão **Criar custo**)
2. O projeto é salvo na planilha e fica disponível na API
3. No **admin do catálogo**, clique em **↻ Importar da gestão** (ou ative importação automática)
4. O produto entra como **Inativo** com nome, código (PRJ-...), filamento e **preço de venda (Preço/peça)**
5. Você edita foto, tags, descrição e marca **Ativo no catálogo público**
6. Clica em **Publicar catálogo**

Produtos inativos **não aparecem** no site público.

---

## Configuração (uma vez)

1. Abra o admin: `https://tnj-3d-catalogo.web.app/admin.html`
2. Vá em **Configurações** → **Integração Gestão TNJ 3D**
3. Cole a URL do Apps Script (a mesma do Empresa_TNJ.3D):

```
https://script.google.com/macros/s/AKfycbw0ExZh2Y-TEl9UU1mvaAiUDhKDoHlKlaE0hOPwTeUcvnm6_NXkgLX9dT5Qzjs7ZvoJpQ/exec
```

4. Marque **Importar automaticamente ao abrir o admin** (opcional)
5. Clique em **Salvar integração** → **Testar conexão**

---

## Planilha vinculada

| Item | Valor |
|------|-------|
| Planilha | [TNJ.3D Gestão](https://docs.google.com/spreadsheets/d/1IRR33vv1pUYtr87Q6OpktZR3WfPHrXUrv2aOq4o1pAA/edit) |
| Aba | `Projetos` |
| ID do projeto | Ex.: `PRJ-20260826-001` |

---

## Campos importados automaticamente

| Campo no catálogo | Origem na gestão |
|-------------------|------------------|
| Nome | Nome Objeto |
| Código | projetoId (PRJ-...) |
| Preço de venda | Preço/peça (`precoSugeridoUnit`) da gestão |
| Subtítulo | Filamento |
| Status | **Inativo** (sempre) |
| Descrição | Texto padrão para você editar |

Você completa manualmente: **foto**, **tags** (TDAH/TEA/Ansiedade), **promoção/kit**, **benefícios**.

---

## Fluxo recomendado

1. Criar custo no Empresa_TNJ.3D
2. Abrir admin do catálogo (importa automaticamente se configurado)
3. Editar o item inativo → adicionar foto e informações
4. Marcar **Ativo no catálogo público**
5. **Publicar catálogo**

---

## Observações

- A integração usa a mesma API JSONP do Empresa_TNJ.3D (`action=projetos`)
- Não é necessário alterar o Apps Script para a importação básica funcionar
- Projetos já importados não são duplicados (vinculados pelo `projetoId`)
- Preços de itens **inativos** ou **sem preço** são atualizados na próxima importação
- Produtos **ativos** com preço já definido mantêm o valor editado manualmente no admin
