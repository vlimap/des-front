# des-front

Frontend React/Vite do CarreiraHub, alinhado com o backend atual de autenticação por OTP.

## Requisitos

- Node.js 18+
- npm
- Backend `des-back` disponível

## Variáveis de ambiente

Arquivos de referência:

- [`.env.example`](/c:/Users/i3831/Desktop/valnei/des-front/.env.example)
- [`.env.production.example`](/c:/Users/i3831/Desktop/valnei/des-front/.env.production.example)

Variáveis suportadas:

- `VITE_API_URL`: origem do backend, sem `/api`
- `VITE_APP_BASE_PATH`: base pública do app, como `/` ou `/carreirahub`

Observação:

- Em produção, se `VITE_API_URL` não estiver definido, o frontend usa `window.location.origin` como fallback.
- Como o projeto usa Vite, `VITE_API_URL` e `VITE_APP_BASE_PATH` precisam existir no momento do build do workflow, não apenas nas app settings do App Service.

## Executar em desenvolvimento

```powershell
cd c:\Users\i3831\Desktop\valnei\des-front
npm install
npm run dev
```

Exemplo local:

```env
VITE_API_URL=http://localhost:4000
VITE_APP_BASE_PATH=/
```

## Build de produção

```powershell
cd c:\Users\i3831\Desktop\valnei\des-front
npm run build
npm run preview
```

O resultado do build é gerado em `dist/`.

## Deploy no Azure App Service

- O workflow publica apenas o conteúdo de `dist/`.
- O App Service é configurado para servir a SPA com `pm2 serve /home/site/wwwroot --no-daemon --spa`.
- O workflow serializa deploys para evitar conflito entre execuções concorrentes.
- Se existir `WEBSITE_RUN_FROM_PACKAGE`, o workflow remove essa app setting antes do deploy.
- O workflow usa `vars.VITE_API_URL` e `vars.VITE_APP_BASE_PATH`; se não existirem, ele cai no backend `valneiback` atual e base path `/`.

## Checklist de produção

- Definir `VITE_API_URL` com a URL pública do backend
- Definir `VITE_APP_BASE_PATH` quando o app não rodar na raiz
- Publicar o frontend por HTTPS
- Garantir `CORS_ORIGIN` correto no backend
- Usar apenas PDF no fluxo de currículo

## Fluxos suportados

- Login com senha e OTP/TOTP quando 2FA estiver ativa
- Verificação de e-mail por OTP
- Redefinição de senha por OTP
- Upload de currículo em PDF
- Cadastro e candidatura integrados ao backend

## Ajustes feitos para produção

- `mockJobs` fica restrito ao ambiente de desenvolvimento
- Currículo usa upload real e URL pública do backend
- `base` do Vite é controlado por ambiente
- Code splitting no build para reduzir o bundle inicial
- Favicon embutido para evitar referência quebrada a `/vite.svg`
