# CentralSync ERP - Frontend

Módulo cliente da aplicação CentralSync ERP, desenvolvido em React, Vite e Tailwind CSS.

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js (versão 18 ou superior recomendada)

### Passos
1. Instale as dependências:
   ```bash
   npm install
   ```
2. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
3. Abra `http://localhost:3000` no seu navegador.

## 📦 Scripts Disponíveis
- `npm run dev`: Inicia o servidor local de desenvolvimento do Vite na porta 3000.
- `npm run build`: Compila a aplicação para produção (diretório `dist`).
- `npm run preview`: Visualiza o build de produção localmente.
- `npm run lint`: Executa a checagem de tipos com TypeScript.

## ⚙️ Deploy (Vercel)
O projeto está configurado com `vercel.json` para suportar rotas SPA perfeitamente.
No painel da Vercel:
1. Conecte seu repositório Git.
2. Defina o **Root Directory** como `frontend`.
3. Mantenha os comandos de build padrão do Vite.
