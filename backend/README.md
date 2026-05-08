# Social Marketing API - Backend

ASP.NET Core Web API for managing platform connections and OAuth authentication for social media platforms.

## Stack

- **.NET 10.0** - Framework
- **C#** - Language
- **Entity Framework Core** - ORM
- **PostgreSQL** (Supabase) - Database
- **ASP.NET Core** - Web Framework

## Prerequisites

- .NET 10.0 SDK
- PostgreSQL connection to Supabase

## Setup

### 1. Clone the repository and navigate to the backend folder

```bash
cd backend
```

### 2. Install dependencies

Dependencies are automatically restored by dotnet build.

### 3. Configure the database connection

Update `appsettings.Development.json` with your Supabase database password:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=shnprnjerqpdzjczgufj.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=YOUR_PASSWORD;SSL Mode=Require;Trust Server Certificate=true;"
  }
}
```

### 4. Run the application

```bash
dotnet run
```

The API will start on `https://localhost:7090` and `http://localhost:5000`

## Project Structure

```
backend/
├── Controllers/          # API endpoints
├── Models/              # Data models
├── Data/                # Database context (EF Core)
├── Services/            # Business logic
├── bin/                 # Build output
├── obj/                 # Build artifacts
└── Program.cs           # Application entry point
```

## API Endpoints

### Platform Connections

- `GET /api/platformconnections/user/{userId}` - Get all platform connections for a user
- `GET /api/platformconnections/{id}` - Get a specific platform connection
- `POST /api/platformconnections/authenticate` - Store OAuth token after authentication
- `DELETE /api/platformconnections/{id}` - Disconnect a platform

## Database Schema

The backend uses Entity Framework Core with the following tables:

### platform_accounts
- `id` - UUID (Primary Key)
- `user_id` - UUID (Foreign Key to auth.users)
- `platform_name` - VARCHAR(50)
- `access_token` - TEXT
- `refresh_token` - TEXT (Optional)
- `token_expires_at` - TIMESTAMP (Optional)
- `is_connected` - BOOLEAN
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP (Optional)

## OAuth Flow

1. Frontend initiates OAuth flow for a platform
2. Platform redirects user to authorization URL
3. User grants permission
4. Platform redirects back with authorization code
5. Frontend sends code + tokens to `/api/platformconnections/authenticate`
6. Backend stores the tokens in the database
7. Tokens can be used to post to the platform on behalf of the user

## Development

### Building
```bash
dotnet build
```

### Running
```bash
dotnet run
```

### Running in watch mode
```bash
dotnet watch run
```

### Publishing
```bash
dotnet publish -c Release
```

## Environment Variables

The connection string can be configured via:
- `appsettings.json` - Production settings
- `appsettings.Development.json` - Development settings

## CORS Configuration

The API allows requests from the React frontend at:
- `http://localhost:5173`
- `http://localhost:5174`

Add additional origins in `Program.cs` if needed.

## Error Handling

The API implements standardized error responses:

```json
{
  "error": "Error message describing the issue"
}
```

## Future Enhancements

- Platform-specific OAuth implementations (X/Twitter, Instagram, etc.)
- Token refresh logic
- Platform-specific API integrations
- Post scheduling and distribution
