# Exercita365b

## Descrição do Projeto
Exercita365b é um sistema de gerenciamento de locais de exercícios físicos, como parques e academias. Os usuários podem se cadastrar, fazer login, adicionar locais de exercício e gerenciar essas informações. Este projeto utiliza Node.js para o backend, Sequelize como ORM e PostgreSQL como banco de dados.

## Funcionalidades
- Cadastro de Usuários
- Autenticação de Usuários com JWT
- Adição de Locais de Exercício
- Listagem de Locais por Usuário
- Atualização de Locais
- Deleção de Locais
- Geração de Links para Google Maps

## Tecnologias Utilizadas
- Node.js
- Express
- Sequelize
- PostgreSQL
- JWT (JSON Web Tokens)
- Swagger (Documentação de API)
- OpenStreetMap (Para obtenção de coordenadas)
- Helmet (Segurança)
- Express Validator (Validação de Dados)

## Instalação
Siga as etapas abaixo para configurar o projeto em sua máquina local:

1. Clone o repositório:
    ```bash
    git clone https://github.com/FuturoDEV-Fitness/exercita365b.git
    cd exercita365b
    ```

2. Instale as dependências:
    ```bash
    npm install
    ```

3. Configure o banco de dados:
    - Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:
        ```
        DB_USERNAME=seu_usuario
        DB_PASSWORD=sua_senha
        DB_DATABASE=exercita365b
        DB_HOST=localhost
        DB_DIALECT=postgres
        JWT_SECRET=sua_chave_secreta
        ```

4. Execute as migrações e seeders:
    ```bash
    npx sequelize-cli db:migrate
    npx sequelize-cli db:seed:all
    ```

5. Inicie o servidor:
    ```bash
    node index.js
    ```

O servidor estará rodando em `http://localhost:3000`.

## Documentação da API
A documentação completa da API pode ser acessada em `http://localhost:3000/api-docs` após iniciar o servidor.

## Contato
[Luiz Henrique Provin] - [provin27@gmail.com]
