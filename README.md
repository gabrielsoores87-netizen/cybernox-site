# CyberNox

Site estático com backend local de autenticação.

## Executar

1. Instale o Node.js LTS em https://nodejs.org/
2. Abra este diretório no terminal.
3. Execute:

```bash
npm start
```

4. Acesse http://localhost:3000

O backend oferece cadastro, login, logout e consulta da sessão em `/api/auth`. As senhas usam `scrypt` e as sessões usam cookie `HttpOnly`. Os usuários são armazenados localmente em `data/users.json`.
