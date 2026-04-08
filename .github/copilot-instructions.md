Migrating repositories from GitHub.com to GitHub Enterprise Cloud

You can migrate repositories from GitHub.com to GitHub Enterprise Cloud, using the GitHub CLI or the GraphQL API.

## GitHub Mobile and gists

No. Gists are not currently available in the GitHub mobile app. To work with gists on mobile, use GitHub in a mobile web browser.

## Tool navigation

- [API](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/migrating-repositories-from-githubcom-to-github-enterprise-cloud?tool=api)
- [GitHub CLI](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/migrating-repositories-from-githubcom-to-github-enterprise-cloud?tool=cli)

## In this article

- [](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/migrating-repositories-from-githubcom-to-github-enterprise-cloud?tool=api#about-repository-migrations-with-github-enterprise-importer)
- [](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/migrating-repositories-from-githubcom-to-github-enterprise-cloud?tool=api#prerequisites)
- [](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/migrating-repositories-from-githubcom-to-github-enterprise-cloud?tool=api#step-0-get-ready-to-use-the-github-graphql-api)
- [](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/migrating-repositories-from-githubcom-to-github-enterprise-cloud?tool=api#step-1-get-the-ownerid-for-your-migration-destination)
- [](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/migrating-repositories-from-githubcom-to-github-enterprise-cloud?tool=api#step-2-identify-where-youre-migrating-from)
- [](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/migrating-repositories-from-githubcom-to-github-enterprise-cloud?tool=api#step-3-start-your-repository-migration)
- [](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/migrating-repositories-from-githubcom-to-github-enterprise-cloud?tool=api#step-4-check-the-status-of-your-migration)
- [](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/migrating-repositories-from-githubcom-to-github-enterprise-cloud?tool=api#step-5-validate-your-migration-and-check-the-error-log)

## [About repository migrations with GitHub Enterprise Importer](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/migrating-repositories-from-githubcom-to-github-enterprise-cloud?tool=api#about-repository-migrations-with-github-enterprise-importer)

Migrations to GitHub Enterprise Cloud include migrations between accounts on GitHub.com and, if you're adopting data residency, migrations to your enterprise's subdomain of GHE.com.

You can run your migration with either the GitHub CLI or the API.

The GitHub CLI simplifies the migration process and is recommended for most customers. Advanced customers with heavy customization needs can use the API to build their own integrations with GitHub Enterprise Importer.

To see instructions for using the GitHub CLI, use the tool switcher at the top of the page.

## [Prerequisites](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/migrating-repositories-from-githubcom-to-github-enterprise-cloud?tool=api#prerequisites)

- We strongly recommend that you perform a trial run of your migration and complete your production migration soon after. To learn more about trial runs, see [Overview of a migration between GitHub products](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/overview-of-a-migration-between-github-products#running-your-migrations).
- Ensure you understand the data that will be migrated and the known support limitations of the Importer. For more information, see [About migrations between GitHub products](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/about-migrations-between-github-products).
- While not required, we recommend halting work during your production migration. The Importer doesn't support delta migrations, so any changes that happen during the migration will not migrate. If you choose not to halt work during your production migration, you'll need to manually migrate these changes.
- In both the source and destination organization, you must be either an organization owner or be granted the migrator role. For more information, see [Managing access for a migration between GitHub products](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/managing-access-for-a-migration-between-github-products#about-the-migrator-role).

## [Step 0: Get ready to use the GitHub GraphQL API](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/migrating-repositories-from-githubcom-to-github-enterprise-cloud?tool=api#step-0-get-ready-to-use-the-github-graphql-api)

To make GraphQL queries, you'll need to write your own scripts or use an HTTP client like [Insomnia](https://insomnia.rest/).

To learn more about getting started with the GitHub GraphQL API, including how to authenticate, see [Forming calls with GraphQL](https://docs.github.com/en/graphql/guides/forming-calls-with-graphql).

You will send all GraphQL queries to the **destination** of your migration. If you're migrating to GitHub Enterprise Cloud with data residency, make sure to send queries to the endpoint for your enterprise's subdomain of GHE.com.

## [Step 1: Get the `ownerId` for your migration destination](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/migrating-repositories-from-githubcom-to-github-enterprise-cloud?tool=api#step-1-get-the-ownerid-for-your-migration-destination)

As an organization owner in GitHub Enterprise Cloud, use the `GetOrgInfo` query to return the `ownerId`, also called the organization ID, for the organization you want to own the migrated repositories. You'll need the `ownerId` to identify your migration destination.

#### [`GetOrgInfo` query](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/migrating-repositories-from-githubcom-to-github-enterprise-cloud?tool=api#getorginfo-query)

```graphql
query(
  $login: String!
){
  organization (login: $login)
  {
    login
    id
    name
    databaseId
  }
}
```

|Query variable|Description|
|---|---|
|`login`|Your organization name.|

#### [`GetOrgInfo` response](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/migrating-repositories-from-githubcom-to-github-enterprise-cloud?tool=api#getorginfo-response)

```json
{
  "data": {
    "organization": {
      "login": "Octo",
      "id": "MDEyOk9yZ2FuaXphdGlvbjU2MTA=",
      "name": "Octo-org",
      "databaseId": 5610
    }
  }
}
```

In this example, `MDEyOk9yZ2FuaXphdGlvbjU2MTA=` is the organization ID or `ownerId`, which we'll use in the next step.

## [Step 2: Identify where you're migrating from](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/migrating-repositories-from-githubcom-to-github-enterprise-cloud?tool=api#step-2-identify-where-youre-migrating-from)

You can set up a migration source using the `createMigrationSource` query. You'll need to supply the `ownerId`, or organization ID, gathered from the `GetOrgInfo` query.

Your migration source is an organization on GitHub.com.

### [`createMigrationSource` mutation](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/migrating-repositories-from-githubcom-to-github-enterprise-cloud?tool=api#createmigrationsource-mutation)

```graphql
mutation createMigrationSource($name: String!, $ownerId: ID!) {
  createMigrationSource(input: {name: $name, url: "https://github.com", ownerId: $ownerId, type: GITHUB_ARCHIVE}) {
    migrationSource {
      id
      name
      url
      type
    }
  }
}
```

Note

Make sure to use `GITHUB_ARCHIVE` for `type`.

|Query variable|Description|
|---|---|
|`name`|A name for your migration source. This name is for your own reference, so you can use any string.|
|`ownerId`|The organization ID of your organization on GitHub Enterprise Cloud.|

### [`createMigrationSource` response](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/migrating-repositories-from-githubcom-to-github-enterprise-cloud?tool=api#createmigrationsource-response)

```json
{
  "data": {
    "createMigrationSource": {
      "migrationSource": {
        "id": "MS_kgDaACQxYmYxOWU4Yi0wNzZmLTQ3NTMtOTdkZC1hNGUzZmYxN2U2YzA",
        "name": "GitHub.com Source",
        "url": "https://github.com",
        "type": "GITHUB_SOURCE"
      }
    }
  }
}
```

In this example, `MS_kgDaACQxYmYxOWU4Yi0wNzZmLTQ3NTMtOTdkZC1hNGUzZmYxN2U2YzA` is the migration source ID, which we'll use in the next step.

## [Step 3: Start your repository migration](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/migrating-repositories-from-githubcom-to-github-enterprise-cloud?tool=api#step-3-start-your-repository-migration)

When you start a migration, a single repository and its accompanying data migrates into a brand new GitHub repository that you identify.

If you want to move multiple repositories at once from the same source organization, you can queue multiple migrations. You can run up to 5 repository migrations at the same time.

### [`startRepositoryMigration` mutation](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/migrating-repositories-from-githubcom-to-github-enterprise-cloud?tool=api#startrepositorymigration-mutation)

```graphql
mutation startRepositoryMigration (
  $sourceId: ID!,
  $ownerId: ID!,
  $sourceRepositoryUrl: URI!,
  $repositoryName: String!,
  $continueOnError: Boolean!,
  $accessToken: String!,
  $githubPat: String!,
  $targetRepoVisibility: String!
){
  startRepositoryMigration( input: {
    sourceId: $sourceId,
    ownerId: $ownerId,
    repositoryName: $repositoryName,
    continueOnError: $continueOnError,
    accessToken: $accessToken,
    githubPat: $githubPat,
    targetRepoVisibility: $targetRepoVisibility
    sourceRepositoryUrl: $sourceRepositoryUrl,
  }) {
    repositoryMigration {
      id
      migrationSource {
        id
        name
        type
      }
      sourceUrl
    }
  }
}
```

|Query variable|Description|
|---|---|
|`sourceId`|Your migration source `id` returned from the `createMigrationSource` mutation.|
|`ownerId`|The organization ID of your organization on GitHub Enterprise Cloud.|
|`repositoryName`|A custom unique repository name not currently used by any of your repositories owned by the organization on GitHub Enterprise Cloud. An error-logging issue will be created in this repository when your migration is complete or has stopped.|
|`continueOnError`|Migration setting that allows the migration to continue when encountering errors that don't cause the migration to fail. Must be `true` or `false`. We highly recommend setting `continueOnError` to `true` so that your migration will continue unless the Importer can't move Git source or the Importer has lost connection and cannot reconnect to complete the migration.|
|`githubPat`|The personal access token for your destination organization on GitHub Enterprise Cloud.|
|`accessToken`|The personal access token for your source.|
|`targetRepoVisibility`|The visibility of the new repository. Must be `private`, `public`, or `internal`. If not set, your repository is migrated as private.|
|`sourceRepositoryUrl`|The URL of your source repository, using the format `https://github.com/{organization}/{repository}`.|

For personal access token requirements, see [Managing access for a migration between GitHub products](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/managing-access-for-a-migration-between-github-products#required-scopes-for-personal-access-tokens).

In the next step, you'll use the migration ID returned from the `startRepositoryMigration` mutation to check the migration status.

## [Step 4: Check the status of your migration](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/migrating-repositories-from-githubcom-to-github-enterprise-cloud?tool=api#step-4-check-the-status-of-your-migration)

To detect any migration failures and ensure your migration is working, you can check your migration status using the `getMigration` query. You can also check the status of multiple migrations with `getMigrations`.

The `getMigration` query will return with a status to let you know if the migration is `queued`, `in progress`, `failed`, or `completed`. If your migration failed, the Importer will provide a reason for the failure.

#### [`getMigration` query](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/migrating-repositories-from-githubcom-to-github-enterprise-cloud?tool=api#getmigration-query)

```graphql
query (
  $id: ID!
){
  node( id: $id ) {
    ... on Migration {
      id
      sourceUrl
      migrationSource {
        name
      }
      state
      failureReason
    }
  }
}
```

|Query variable|Description|
|---|---|
|`id`|The `id` of your migration that [the `startRepositoryMigration` mutation](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/migrating-repositories-from-githubcom-to-github-enterprise-cloud?tool=api#startrepositorymigration-mutation) returned.|

## [Step 5: Validate your migration and check the error log](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/migrating-repositories-from-githubcom-to-github-enterprise-cloud?tool=api#step-5-validate-your-migration-and-check-the-error-log)

To finish your migration, we recommend that you check the "Migration Log" issue. This issue is created on GitHub in the destination repository.

![Screenshot of an issue with the title "Migration Log." The second comment in the issue includes logs for a migration.](https://docs.github.com/assets/cb-181113/images/help/github-enterprise-importer/migration-log-issue.png)

Finally, we recommend that you review your migrated repositories for a soundness check.
