# Social Marketing Tool - Architecture & Setup Guide

A comprehensive digital marketing content management system built with a modern full-stack architecture.

## 🏗️ Technology Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Tailwind-inspired CSS** - Custom styling (no dependencies)

### Backend
- **.NET 10.0** - Framework
- **C#** - Language
- **ASP.NET Core** - Web API framework
- **Entity Framework Core** - ORM for data access
- **Dapper** - Lightweight data mapper (ready for integration)

### Database
- **PostgreSQL** - Database engine
- **Supabase** - PostgreSQL hosting with Auth integration
- **Entity Framework Core** - Database abstraction

### Authentication
- **Supabase Auth** - User authentication (frontend)
- **JWT Tokens** - Stateless authentication
- **Row-Level Security (RLS)** - Database-level access control

## 📁 Project Structure

```
social-marketing-tool/
├── src/                          # React frontend
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── DashboardPage.tsx
│   ├── services/
│   │   ├── authApi.ts           # Supabase auth integration
│   │   ├── dashboardApi.ts      # Dashboard data operations
│   │   └── supabaseClient.ts    # Supabase client configuration
│   ├── App.tsx                  # Route definitions and guards
│   ├── main.tsx                 # React entry point
│   └── index.css                # Global styling
├── backend/                      # .NET API
│   ├── Controllers/
│   │   └── PlatformConnectionsController.cs  # Platform OAuth endpoints
│   ├── Models/
│   │   └── PlatformConnection.cs             # Data model
│   ├── Data/
│   │   └── SocialMarketingContext.cs         # EF Core DbContext
│   ├── Services/
│   │   └── IPlatformAuthService.cs           # OAuth interface
│   ├── Program.cs               # Application startup
│   ├── appsettings.json         # Configuration
│   └── README.md                # Backend documentation
├── supabase/
│   └── migrations/
│       └── 20260509000100_auth_dashboard_access.sql
├── package.json                 # Frontend dependencies
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
├── index.html                  # HTML entry point
└── README.md                   # This file
```

## 🔐 Authentication Flow

### User Registration
1. User enters email, username, password on `/register`
2. Frontend sends credentials to Supabase Auth
3. Supabase creates user in `auth.users` table
4. Trigger automatically creates entry in public `users` table
5. User is redirected to dashboard

### User Login
1. User enters email and password on `/login`
2. Frontend submits to Supabase Auth
3. Supabase validates credentials and returns JWT
4. Frontend stores session token and navigates to `/dashboard`
5. Protected routes check session validity

### Row-Level Security (RLS)
All database tables have RLS enabled with policies ensuring users can only access their own data:
- `users` - Users can read and update their own profile
- `posts` - Users can CRUD their own posts
- `platform_accounts` - Users can manage their platform connections
- `post_platform_targets` - Users can manage targets for their posts

## 📊 Database Schema

### auth.users (Supabase Auth)
- Managed by Supabase
- Stores authentication credentials
- Contains user metadata

### public.users
- `id` (UUID, PK) - User identifier from auth.users
- `username` - Display name
- `email` - User email
- `password_hash` - Set to 'managed-by-supabase-auth'
- `created_at` - Account creation timestamp

### public.posts
- `id` (UUID, PK)
- `user_id` (UUID, FK) - Owner of the post
- `content` (TEXT) - Post content
- `media_urls` (ARRAY) - Attached media URLs
- `status` - 'draft', 'scheduled', or 'published'
- `scheduled_at` - Publication timestamp
- `created_at` - Creation timestamp

### public.platform_accounts
- `id` (UUID, PK)
- `user_id` (UUID, FK) - Account owner
- `platform_name` - 'x', 'instagram', 'facebook', 'threads', 'linkedin'
- `access_token` - OAuth access token
- `refresh_token` - OAuth refresh token
- `token_expires_at` - Token expiration
- `is_connected` - Connection status
- `created_at` - Created timestamp

### public.post_platform_targets
- `id` (UUID, PK)
- `post_id` (UUID, FK) - Target post
- `platform_name` - Destination platform
- `platform_post_id` - Post ID on external platform
- `status` - 'pending', 'published', 'failed'
- `error_message` - Failure reason
- `published_at` - Publication timestamp

## 🚀 Getting Started

### Frontend Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   Create `.env.local`:
   ```
   VITE_SUPABASE_URL=https://shnprnjerqpdzjczgufj.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   Access at `http://localhost:5174`

4. **Build for production**
   ```bash
   npm run build
   ```

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Configure database connection**
   Edit `appsettings.Development.json`:
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Host=shnprnjerqpdzjczgufj.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=YOUR_PASSWORD;SSL Mode=Require;Trust Server Certificate=true;"
     }
   }
   ```

3. **Run the API**
   ```bash
   dotnet run
   ```
   Access at `https://localhost:7090`

## 🔄 Data Flow

### Creating a Post
1. User fills composer form on dashboard
2. Frontend validates and calls `/api/posts` (or Supabase directly via RLS)
3. Post is inserted into `posts` table with `user_id`
4. For each selected platform, entry is created in `post_platform_targets`
5. Backend (when implemented) can queue delivery to platforms
6. Platform targets are updated with external post IDs and status

### Platform Connection Flow
1. User clicks "Connect Platform" (to be implemented)
2. Frontend redirects to platform OAuth URL (generated by backend)
3. Platform authenticates user and redirects back with auth code
4. Frontend sends code to backend: `POST /api/platformconnections/authenticate`
5. Backend exchanges code for access token
6. Backend stores token in `platform_accounts` table
7. User can now publish posts to that platform

## 🔒 Security Considerations

### Frontend
- Service role key is **never** stored in frontend
- Only anon key used for Supabase queries
- RLS prevents cross-user data access
- JWT tokens expire automatically

### Backend
- Service role key stored securely in `appsettings.Development.json`
- Database connection uses SSL
- CORS configured to allow only specific origins
- Input validation on all endpoints
- Error messages don't leak sensitive information

### Database
- All tables have RLS enabled
- Policies enforce `auth.uid() = user_id` checks
- Foreign keys enforce referential integrity
- Indexes on frequently queried columns

## 📈 Scaling Considerations

### Performance
- React Router enables client-side navigation (no full page reloads)
- Supabase handles database scaling automatically
- EF Core connection pooling for backend
- Lazy loading for large post lists

### Future Enhancements
- Implement OAuth for each platform (X, Instagram, Facebook, etc.)
- Add post scheduling with background jobs
- Implement media upload to cloud storage (S3)
- Add analytics and performance tracking
- Implement team/organization support
- Add webhook handlers for platform events

## 🛠️ Development Workflow

### Adding a New Feature

1. **Update database schema** (if needed)
   - Create migration in `supabase/migrations/`
   - Apply via Supabase dashboard

2. **Update frontend**
   - Add React components in `src/pages/` or `src/components/`
   - Add data service in `src/services/`
   - Add routes in `src/App.tsx`

3. **Update backend** (if needed)
   - Add models in `Models/`
   - Add controllers in `Controllers/`
   - Add services in `Services/`

4. **Test**
   - Run `npm run build` for frontend
   - Run `dotnet build` for backend
   - Test in development environment

5. **Commit and push**
   ```bash
   git add .
   git commit -m "Add new feature"
   git push origin main
   ```

## 📚 API Documentation

### Platform Connections Endpoints

#### Get User's Platform Connections
```http
GET /api/platformconnections/user/{userId}
```

Response:
```json
[
  {
    "id": "uuid",
    "platformName": "x",
    "isConnected": true,
    "tokenExpiresAt": "2026-05-15T10:30:00Z",
    "createdAt": "2026-05-08T15:30:00Z"
  }
]
```

#### Authenticate Platform
```http
POST /api/platformconnections/authenticate
Content-Type: application/json

{
  "userId": "uuid",
  "platform": "x",
  "accessToken": "token",
  "refreshToken": "refresh_token",
  "tokenExpiresAt": "2026-05-15T10:30:00Z"
}
```

#### Disconnect Platform
```http
DELETE /api/platformconnections/{id}
```

## 📝 Notes

- All timestamps are in UTC
- IDs are UUIDs (v4)
- Supabase API endpoint: `https://shnprnjerqpdzjczgufj.supabase.co`
- Frontend defaults to port 5174 (Vite)
- Backend defaults to port 7090 (HTTPS) and 5000 (HTTP)

## 🤝 Contributing

When contributing, ensure:
- Frontend changes pass TypeScript compilation
- Backend changes pass `dotnet build`
- Database changes are migrations from Supabase
- Code follows existing style conventions
- Commits are atomic and well-described

## 📄 License

Not specified - Add as needed
