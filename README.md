# Automacoes

Este repositório contém scripts de automação para Instagram e WhatsApp.

## Estrutura do Projeto

- **instagram_bot/**: Bot para automação de interações no Instagram.
- **whatsapp_bot/**: Bot para automação de mensagens e leitura OCR no WhatsApp.

## Pré-requisitos

- [Node.js](https://nodejs.org/) instalado.
- Conta no Google Cloud (para APIs do Sheets/Drive, se aplicável).

## Instalação

1. Clone o repositório:
   ```bash
   git clone https://github.com/kao04/automacoes.git
   ```
2. Instale as dependências em cada pasta do bot:

   **WhatsApp Bot:**
   ```bash
   cd whatsapp_bot
   npm install
   ```

   **Instagram Bot:**
   ```bash
   cd instagram_bot
   npm install
   ```

## Configuração

Crie um arquivo `.env` dentro da pasta `whatsapp_bot` (e `instagram_bot` se necessário) com as suas credenciais. O arquivo `.env` não é versionado por questões de segurança.

## Uso

**WhatsApp Bot:**
```bash
cd whatsapp_bot
node index.js
```

**Instagram Bot:**
```bash
cd instagram_bot
node index.js
```
