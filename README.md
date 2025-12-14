# SHORT_LINK API

Here we build SHORT_LINK api's to meet the requirements.

## Description

#### NestJs (TypeScript,express), mysql

## Project setup

```bash
1. git clone https://github.com/iamanupambera/short-link.git
```

```bash
2. npm install
```

```bash
3. cp .env.example .env
```

```bash
4. npm run migration:run
```

```bash
5. npm run seed:run
```

## Compile and run the project

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

## Migrtaion

Anytime model changes are made run

```bash
model_name=<YOUR-DB-CHANGE-NAME> npm run migration:run`. This will generate a file with all DB changes, you need to ommit all other changes you dont want from the migration file.
```

Create an empty migration

```bash
model_name=<migration-name> npm run migration:create
```

Now run migration again:

```bash
npm run migration:run
```

## Seeder

Run seeder:

```bash
npm run seed:run
```

Create new seeder:

```bash
model_name=<YOUR-DB-ENTITY-NAME> npm run seed:create
```

## Built in API documentation

Visit [http://localhost:3000/api-docs](http://localhost:3000/api-docs) to view
the interactive swagger docs for the API. These docs are generated on-the-fly
based on the decorators used on the controllers.

## Local development URLs

- API URL [http://localhost:3000/api/v1](http://localhost:3000/api/v1)

## reference documentation

- [NEST JS - A progressive Node.js framework](https://docs.nestjs.com/)
