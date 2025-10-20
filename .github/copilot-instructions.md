# Migrating repositories from GitHub.com to GitHub Enterprise Cloud

You can migrate repositories from GitHub.com to GitHub Enterprise Cloud, using the GitHub CLI or the GraphQL API.

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


---
# Migrating repositories from GitHub Enterprise Server to GitHub Enterprise Cloud
You can migrate repositories from GitHub Enterprise Server to GitHub Enterprise Cloud, using the GitHub CLI or API.

Tool navigation
API
GitHub CLI
In this article
About repository migrations with GitHub Enterprise Importer
You can run your migration with either the GitHub CLI or the API.

The GitHub CLI simplifies the migration process and is recommended for most customers. Advanced customers with heavy customization needs can use the API to build their own integrations with GitHub Enterprise Importer.

If you choose to use the API, you'll need to write your own scripts or use an HTTP client like Insomnia. You can learn more about getting started with GitHub's APIs in Getting started with the REST API and Forming calls with GraphQL.

To migrate your repositories from GitHub Enterprise Server to GitHub Enterprise Cloud with the APIs, you will:

Create a personal access token for both the source and destination organization
Fetch the ownerId of the destination organization on GitHub Enterprise Cloud
Set up a migration source via GitHub's GraphQL API to identify where you're migrating from
For each repository you want to migrate, repeat these steps.
Use the REST API on your GitHub Enterprise Server instance to generate migration archives for your repository
Upload your migration archives to a location where they can be accessed by GitHub
Start your migration using the GraphQL API for your migration destination, passing in your archive URLs
Check the status of your migration via the GraphQL API
Validate your migration and check the error log
To see instructions for using the GitHub CLI, use the tool switcher at the top of the page.

Prerequisites
We strongly recommend that you perform a trial run of your migration and complete your production migration soon after. To learn more about trial runs, see Overview of a migration between GitHub products.
Ensure you understand the data that will be migrated and the known support limitations of the Importer. For more information, see About migrations between GitHub products.
While not required, we recommend halting work during your production migration. The Importer doesn't support delta migrations, so any changes that happen during the migration will not migrate. If you choose not to halt work during your production migration, you'll need to manually migrate these changes.
In both the source and destination organizations, you must be either an organization owner or be granted the migrator role. For more information, see Managing access for a migration between GitHub products.
If you use GitHub Enterprise Server 3.8 or higher, to configure blob storage for exported archives, you need access to the Management Console.
### Step 1. Create your personal access token
Create and record a personal access token (classic) that will authenticate for the destination organization on GitHub Enterprise Cloud, making sure that the token meets all requirements. For more information, see Managing access for a migration between GitHub products.
Create and record a personal access token that will authenticate for the source organization, making sure that this token also meets all of the same requirements.
### Step 2: Get the ownerId for the destination organization
As an organization owner in GitHub Enterprise Cloud, use the GetOrgInfo query to return the ownerId, also called the organization ID, for the organization you want to own the migrated repositories. You'll need the ownerId to identify your migration destination.

GetOrgInfo query
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
Query variable	Description
login	Your organization name.
GetOrgInfo response
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
In this example, MDEyOk9yZ2FuaXphdGlvbjU2MTA= is the organization ID or ownerId, which we'll use in the next step.

### Step 3: Set up blob storage
When performing a repository migration, you must store your repository data in a place that GitHub Enterprise Importer can access. This can be accomplished by:

Using local storage on the GHES instance (GHES 3.16 and later)
Using a blob storage provider
Using local storage (GHES 3.16+)
When you run a migration with local storage, archive data is written to the disk on your GitHub Enterprise Server instance, without the need for a cloud storage provider.

If you do not have firewall rules blocking egress traffic from GitHub Enterprise Server, GitHub Enterprise Importer can automatically retrieve the stored archive from GitHub Enterprise Server.
If you do have firewall rules in place and don't want to allow access to GitHub Enterprise Importer, you can upload your archive data to GitHub-owned blob storage for GitHub Enterprise Importer to access. To do so manually, see Uploading your migration archives to GitHub-owned blob storage in the API version of this article.
From an administrative account on GitHub Enterprise Server, in the upper-right corner of any page, click .
In the " Site admin" sidebar, click Management Console.
Sign in to the Management Console.
In the left sidebar, click Migrations.
Click Enable GitHub Migrations.
Under "Migrations Storage", click Local Storage.
Click Save settings.
When you perform the migration, monitor your disk space on GitHub Enterprise Server. Migration archives are automatically deleted after 7 days. To free up space, you can delete an archive using the REST API endpoints for organization migrations.

Using a blob storage provider
If your GitHub Enterprise Server instance is behind a firewall, you may need to set up blob storage with an external cloud service.

First, you must set up blob storage with a supported provider. Then, if you're using a cloud provider, you must configure your credentials for the storage provider in the Management Console or GitHub CLI.

The GitHub CLI supports the following blob storage providers:

Amazon Web Services (AWS) S3
Azure Blob Storage
Note

You only need to configure blob storage if you use GitHub Enterprise Server versions 3.8 or higher. If you use GitHub Enterprise Server versions 3.7 or lower, skip to Step 4: Set up a migration source in GitHub Enterprise Cloud.

Blob storage is required to migrate repositories with large Git source or metadata. If you use GitHub Enterprise Server versions 3.7 or lower, you will not be able to perform migrations where your Git source or metadata exports exceed 2GB. To perform these migrations, update to GitHub Enterprise Server versions 3.8 or higher.

Setting up an AWS S3 storage bucket
In AWS, set up a S3 bucket. For more information, see Creating a bucket in the AWS documentation.

You will also need an AWS access key and secret key with the following permissions:

{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:ListBucketMultipartUploads",
                "s3:AbortMultipartUpload",
                "s3:ListBucket",
                "s3:DeleteObject",
                "s3:ListMultipartUploadParts"
            ],
            "Resource": [
                "arn:aws:s3:::github-migration-bucket",
                "arn:aws:s3:::github-migration-bucket/*"
            ]
        }
    ]
}
Note

GitHub Enterprise Importer does not delete your archive from AWS after your migration is finished. To reduce storage costs, we recommend configuring auto-deletion of your archive after a period of time. For more information, see Setting lifecycle configuration on a bucket in the AWS documentation.

Setting up an Azure Blob Storage account
In Azure, create a storage account and make a note of your connection string. For more information, see Manage storage account access keys in Microsoft Docs.

Note

GitHub Enterprise Importer does not delete your archive from Azure Blob Storage after your migration is finished. To reduce storage costs, we recommend configuring auto-deletion of your archive after a period of time. For more information, see Optimize costs by automatically managing the data lifecycle in Microsoft Docs.

Configuring blob storage in the Management Console of your GitHub Enterprise Server instance
After you set up an AWS S3 storage bucket or Azure Blob Storage storage account, configure blob storage in the Management Console of your GitHub Enterprise Server instance. For more information about the Management Console, see Administering your instance from the Management Console.

From an administrative account on GitHub Enterprise Server, in the upper-right corner of any page, click .

If you're not already on the "Site admin" page, in the upper-left corner, click Site admin.

In the " Site admin" sidebar, click Management Console.

Log into the Management Console.

In the top navigation bar, click Settings.

Under Migrations, click Enable GitHub Migrations.

Optionally, to import storage settings you configured for GitHub Actions, select Copy Storage settings from Actions. For more information see, Enabling GitHub Actions with Azure Blob storage and Enabling GitHub Actions with Amazon S3 storage.

Note

After copying your storage settings, you may still need to update the configuration of your cloud storage account to work with GitHub Enterprise Importer. In particular, you must ensure that GitHub's IP addresses are allowlisted. For more information, see Managing access for a migration between GitHub products.

If you do not import storage settings from GitHub Actions, select either Azure Blob Storage or Amazon S3 and fill in the required details.

Note

If you use Amazon S3, you must set the "AWS Service URL" to the standard endpoint for the AWS region where your bucket is located. For example, if your bucket is located in the eu-west-1 region, the "AWS Service URL" would be https://s3.eu-west-1.amazonaws.com. Your GitHub Enterprise Server instance's network must allow access to this host. Gateway endpoints are not supported, such as bucket.vpce-0e25b8cdd720f900e-argc85vg.s3.eu-west-1.vpce.amazonaws.com. For more information about gateway endpoints, see Gateway endpoints for Amazon S3 in the AWS documentation.

Click Test storage settings.

Click Save settings.

Allowing network access
If you have configured firewall rules on your storage account, ensure you have allowed access to the IP ranges for your migration destination. See Managing access for a migration between GitHub products.

### Step 4: Set up a migration source in GitHub Enterprise Cloud
You can set up a migration source using the createMigrationSource query. You'll need to supply the ownerId, or organization ID, gathered from the GetOrgInfo query.

Your migration source is your organization on GitHub Enterprise Server.

createMigrationSource mutation
mutation createMigrationSource($name: String!, $url: String!, $ownerId: ID!) {
  createMigrationSource(input: {name: $name, url: $url, ownerId: $ownerId, type: GITHUB_ARCHIVE}) {
    migrationSource {
      id
      name
      url
      type
    }
  }
}
Note

Make sure to use GITHUB_ARCHIVE for type.

Query variable	Description
name	A name for your migration source. This name is for your own reference, so you can use any string.
ownerId	The organization ID of your organization on GitHub Enterprise Cloud.
url	The URL for your GitHub Enterprise Server instance. This URL does not need to be accessible from GitHub Enterprise Cloud.
createMigrationSource response
{
  "data": {
    "createMigrationSource": {
      "migrationSource": {
        "id": "MS_kgDaACRjZTY5NGQ1OC1mNDkyLTQ2NjgtOGE1NS00MGUxYTdlZmQwNWQ",
        "name": "GHES Source",
        "url": "https://my-ghes-hostname.com",
        "type": "GITHUB_ARCHIVE"
      }
    }
  }
}
In this example, MS_kgDaACRjZTY5NGQ1OC1mNDkyLTQ2NjgtOGE1NS00MGUxYTdlZmQwNWQ is the migration source ID, which we'll use in a later step.

### Step 5: Generate migration archives on your GitHub Enterprise Server instance
You will use the REST API to start two "migrations" in GitHub Enterprise Server: one to generate an archive of your repository's Git source, and one to generate an archive of your repository's metadata (such as issues and pull requests).

To generate the Git source archive, make a POST request to https://HOSTNAME/api/v3/orgs/ORGANIZATION/migrations, replacing HOSTNAME with the hostname of your GitHub Enterprise Server instance, and ORGANIZATION with your organization's login.

In the body, specify the single repository you want to migrate. Your request will look something like this:

POST /api/v3/orgs/acme-corp/migrations HTTP/1.1
Accept: application/vnd.github+json
Authorization: Bearer <TOKEN>
Content-Type: application/json
Host: github.acmecorp.net

{
  "repositories": ["repository_to_migrate"],
  "exclude_metadata": true
}
To generate your metadata archive, send a similar request to the same URL with the following body:

{
  "repositories": ["repository_to_migrate"],
  "exclude_git_data": true,
  "exclude_releases": false,
  "exclude_owner_projects": true
}
Each of these two API calls will return a JSON response including the ID of the migration you have started.

HTTP/1.1 201 Created

{
  "id": 123,
  // ...
}
For more information, see Start an organization migration.

Generating the archives can take a while, depending on the amount of data. You can regularly check the status of the two migrations with the "Get an organization migration status" API until the state of the migration changes to exported.

GET /api/v3/orgs/acme-corp/migrations/123 HTTP/1.1
Accept: application/vnd.github+json
Authorization: Bearer <TOKEN>
Host: github.acmecorp.net

HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": 123,
  "state": "exported",
  // ...
}
For more information, see Get an organization migration status.

Note

If your migration moves to the failed state rather than the exported state, try starting the migration again. If the migration fails repeatedly, we recommend generating the archives using ghe-migrator instead of the API.

Follow the steps in Exporting migration data from your enterprise, adding only one repository to the migration. At the end of the process, you will have a single migration archive with your Git source and metadata, and you can move to step 6 in this article.

After the state of a migration moves to exported, you can fetch the migration's URL using the "Download an organization migration archive" API.

GET /api/v3/orgs/acme-corp/migrations/123/archive HTTP/1.1
Accept: application/vnd.github+json
Authorization: Bearer <TOKEN>
Host: github.acmecorp.net

HTTP/1.1 302 Found
Location: https://media.github.acmecorp.net/migrations/123/archive/cca2ebe9-7403-4ffa-9b6a-4c9e16c94410?token=AAAAABEWE7JP4H2HACKEGMTDOYRC6
The API will return a 302 Found response with a Location header redirecting to the URL where the downloadable archive is located. Download the two files: one for the Git source, and one for the metadata.

For more information, see Download an organization migration archive.

After both migrations have completed and you have downloaded the archives, you can move to the next step.

### Step 6: Upload your migration archives  
To import your data into GitHub Enterprise Cloud, you must pass both archives for each repository (Git source and metadata) from your machine to GitHub, using our GraphQL API.

If you're using GitHub Enterprise Server 3.7 or lower, you must first generate URLs for the archives that are accessible by GitHub. Most customers choose to upload the archives to a cloud provider's blob storage service, such as Amazon S3 or Azure Blob Storage, then generate a short-lived URL for each.

If you're using GitHub Enterprise Server 3.8 or higher, your instance uploads the archives and generates the URLs for you. The Location header in the previous step will return the short-lived URL.

You may need to allowlist GitHub's IP ranges. For more information, see Managing access for a migration between GitHub products.

### Step 7: Start your repository migration
When you start a migration, a single repository and its accompanying data migrates into a brand new GitHub repository that you identify.

If you want to move multiple repositories at once from the same source organization, you can queue multiple migrations. You can run up to 5 repository migrations at the same time.

startRepositoryMigration mutation
mutation startRepositoryMigration (
  $sourceId: ID!,
  $ownerId: ID!,
  $repositoryName: String!,
  $continueOnError: Boolean!,
  $accessToken: String!,
  $githubPat: String!,
  $gitArchiveUrl: String!,
  $metadataArchiveUrl: String!,
  $sourceRepositoryUrl: URI!,
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
    gitArchiveUrl: $gitArchiveUrl,
    metadataArchiveUrl: $metadataArchiveUrl,
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
Query variable	Description
sourceId	Your migration source id returned from the createMigrationSource mutation.
ownerId	The organization ID of your organization on GitHub Enterprise Cloud.
repositoryName	A custom unique repository name not currently used by any of your repositories owned by the organization on GitHub Enterprise Cloud. An error-logging issue will be created in this repository when your migration is complete or has stopped.
continueOnError	Migration setting that allows the migration to continue when encountering errors that don't cause the migration to fail. Must be true or false. We highly recommend setting continueOnError to true so that your migration will continue unless the Importer can't move Git source or the Importer has lost connection and cannot reconnect to complete the migration.
githubPat	The personal access token for your destination organization on GitHub Enterprise Cloud.
accessToken	The personal access token for your source.
targetRepoVisibility	The visibility of the new repository. Must be private, public, or internal. If not set, your repository is migrated as private.
gitArchiveUrl	A GitHub Enterprise Cloud-accessible URL for your Git source archive.
metadataArchiveUrl	A GitHub Enterprise Cloud-accessible URL for your metadata archive.
sourceRepositoryUrl	The URL for your repository on your GitHub Enterprise Server instance. This is required, but GitHub Enterprise Cloud will not communicate directly with your GitHub Enterprise Server instance.
For personal access token requirements, see Managing access for a migration between GitHub products.

In the next step, you'll use the migration ID returned from the startRepositoryMigration mutation to check the migration status.

### Step 8: Check the status of your migration
To detect any migration failures and ensure your migration is working, you can check your migration status using the getMigration query. You can also check the status of multiple migrations with getMigrations.

The getMigration query will return with a status to let you know if the migration is queued, in progress, failed, or completed. If your migration failed, the Importer will provide a reason for the failure.

getMigration query
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
Query variable	Description
id	The id of your migration that the startRepositoryMigration mutation returned.

---

Put all documentation produced by Copilot in docs/ directory.

---

