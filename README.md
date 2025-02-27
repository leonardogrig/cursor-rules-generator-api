# Cursor Rules Generator API

A Node.js API service that generates rules for packages based on their documentation. The API scrapes documentation using Firecrawl and stores the results in a PostgreSQL database.

## Features

- Accepts a list of package names and returns usage rules for them
- Checks the database first to avoid redundant scraping
- Uses Firecrawl to search for and extract documentation
- Returns structured rules data in a consistent format

run: node generate-cursor-rules.js "package_name" to generate the rule for that specific package. Or leave this out to generate based on the package.json

## API Endpoints

### Generate Rules

```
POST /api/package-rules/generate
```

**Request Body:**

```json
{
  "packages": [
    "@typescript-eslint/parser",
    "eslint",
    "eslint-plugin-n8n-nodes-base",
    "@mendable/firecrawl-js"
  ]
}
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "packageName": "@typescript-eslint/parser",
      "category": "TypeScript ESLint Parser Tips",
      "instructions": [
        "Configure parser options in your ESLint config to customize TypeScript checking",
        "Use with @typescript-eslint/eslint-plugin for complete TypeScript linting",
        "Specify a project field pointing to your tsconfig.json for type-aware rules"
      ]
    },
    {
      "packageName": "eslint",
      "category": "ESLint Usage Tips",
      "instructions": [
        "Use configuration files (.eslintrc.*) to define and customize rules",
        "Apply the --fix flag to automatically fix problems",
        "Integrate with your editor for real-time linting feedback"
      ]
    }
  ]
}
```

## Setup and Installation

1. Clone the repository
2. Install dependencies:
   ```
   yarn install
   ```
3. Set up environment variables in `.env`:
   ```
   DATABASE_URL="your-postgres-connection-string"
   PORT=3000
   FIRECRAWL_API_KEY="your-firecrawl-api-key"
   ```
4. Run database migrations:
   ```
   yarn prisma:migrate
   ```
5. Start the development server:
   ```
   yarn dev
   ```

## Technology Stack

- Node.js & Express for the API server
- TypeScript for type safety
- Prisma as the ORM
- PostgreSQL for data storage
- Firecrawl for web scraping and data extraction
- Axios for HTTP requests

## License

MIT
