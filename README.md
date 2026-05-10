# 📱 Social Marketing Tool

A comprehensive digital marketing content management platform designed to streamline social media management across multiple platforms. Connect your social accounts, schedule posts, and manage your digital presence all from one unified dashboard.

---

## ✨ Key Features

### 🔐 **Secure Authentication**
- Email/password-based user registration and login
- JWT token-based authentication
- Session management with Supabase Auth
- Row-Level Security (RLS) at the database level for maximum privacy

### 🌐 **Multi-Platform Connectivity**
- OAuth integration with major social media platforms
- Secure token storage for platform connections
- One-click platform account linking
- Manage multiple platform accounts from a single dashboard
- Token expiration tracking and refresh management

### 📝 **Content Management**
- Create and schedule posts across multiple platforms
- Draft management system
- Publish posts to connected platforms simultaneously
- Post history and analytics tracking
- Support for rich media content

### 🎯 **Smart Dashboard**
- Real-time overview of all platform connections
- Connected platform status monitoring
- Quick access to platform management
- User profile and account settings
- Intuitive UI with responsive design

### 📊 **Data Organization**
- User-specific data isolation
- Platform-specific post targeting
- Connection history and metadata tracking
- Audit logs for all operations

---

## 🏗️ Technology Stack

### **Frontend**
- React 19 with TypeScript for type-safe development
- Vite for fast build and development experience
- React Router for client-side routing
- Supabase JS SDK for authentication and real-time updates
- Custom CSS styling (no dependencies)

### **Backend**
- .NET 10.0 with C# for robust server-side logic
- ASP.NET Core Web API for RESTful endpoints
- Entity Framework Core for seamless data access
- Dapper ready for advanced querying scenarios

### **Database & Infrastructure**
- PostgreSQL database powered by Supabase
- Row-Level Security for multi-tenant data protection
- Real-time database subscriptions
- Automated backups and high availability

### **Authentication**
- Supabase Auth for secure user management
- JWT tokens for stateless authentication
- OAuth 2.0 for platform integrations

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- .NET 10.0 SDK
- PostgreSQL connection (Supabase recommended)
- Git

### Setup Instructions

#### 1. Clone and Navigate
```bash
git clone https://github.com/ADVAITH-S-DEV/social-marketing-tool.git
cd social-marketing-tool
```

#### 2. Frontend Setup
```bash
# Install dependencies
npm install

# Create .env.local with Supabase credentials
# Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

#### 3. Backend Setup
```bash
cd backend

# Update appsettings.Development.json with your PostgreSQL connection string
# Then restore dependencies and run
dotnet restore
dotnet run
```

#### 4. Start Development Server
```bash
# From project root, run both frontend and backend
npm run dev:all

# Or run separately:
# Terminal 1:
npm run dev

# Terminal 2:
npm run backend
```

The frontend will be available at `http://localhost:5173` and the backend API at `http://localhost:5000`

---

## 📂 Project Structure

```
social-marketing-tool/
├── src/                                    # React Frontend
│   ├── pages/
│   │   ├── LoginPage.tsx                  # User login interface
│   │   ├── RegisterPage.tsx               # User registration
│   │   ├── DashboardPage.tsx              # Main dashboard
│   │   └── OAuthCallbackPage.tsx          # OAuth redirect handler
│   ├── services/
│   │   ├── authApi.ts                     # Authentication service
│   │   ├── dashboardApi.ts                # Dashboard data operations
│   │   └── supabaseClient.ts              # Supabase client config
│   ├── App.tsx                            # Route definitions and guards
│   ├── main.tsx                           # React entry point
│   └── index.css                          # Global styles
│
├── backend/                               # .NET API
│   ├── Controllers/
│   │   ├── PlatformConnectionsController.cs  # OAuth & Platform APIs
│   │   └── PostsController.cs               # Post management APIs
│   ├── Models/
│   │   └── PlatformConnection.cs         # Platform connection model
│   ├── Data/
│   │   └── SocialMarketingContext.cs      # EF Core DbContext
│   ├── Services/
│   │   └── PlatformValidationService.cs  # Platform validation logic
│   ├── Program.cs                        # Application configuration
│   └── appsettings.json                  # API settings
│
├── supabase/
│   └── migrations/                        # Database migrations
│       └── 20260509000100_auth_dashboard_access.sql
│
├── ARCHITECTURE.md                        # Detailed architecture guide
└── README.md                             # This file
```

---

## 🔌 API Endpoints

### Platform Connections
- `GET /api/platformconnections/user/{userId}` - Get all platform connections for user
- `GET /api/platformconnections/{id}` - Get specific platform connection details
- `POST /api/platformconnections/authenticate` - Store OAuth tokens after authentication
- `DELETE /api/platformconnections/{id}` - Disconnect a platform account

### Posts
- `GET /api/posts/user/{userId}` - Get all posts for user
- `POST /api/posts` - Create new post
- `PUT /api/posts/{id}` - Update post
- `DELETE /api/posts/{id}` - Delete post
- `POST /api/posts/{id}/publish` - Publish post to connected platforms

---

## 🔐 Security Features

- **Row-Level Security (RLS)**: Database policies ensure users only access their own data
- **JWT Authentication**: Stateless authentication tokens for API calls
- **Secure Token Storage**: Platform OAuth tokens encrypted and securely stored
- **Input Validation**: Platform validation service prevents invalid connections
- **CORS Protection**: Restricted cross-origin requests
- **Environment Variables**: Sensitive data stored securely

---

## 📊 Database Schema Highlights

### Core Tables
- **users** - User profiles (synced from auth.users)
- **platform_connections** - OAuth tokens and platform integration metadata
- **posts** - Content items with scheduling and status info
- **post_platforms** - Post-to-platform mappings for multi-platform publishing

All tables include:
- UUID primary keys for distributed systems
- Timestamps (created_at, updated_at)
- RLS policies for multi-tenant isolation

---

## 🛠️ Development Workflows

### Running Tests
```bash
# Frontend tests
npm run test

# Backend tests
dotnet test backend/
```

### Building for Production
```bash
# Frontend build
npm run build

# Backend build
dotnet publish -c Release backend/
```

### Code Quality
```bash
# Lint TypeScript/React
npm run lint

# Format code
npm run format
```

---

## 📝 Environment Variables

### Frontend (.env.local)
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Backend (appsettings.Development.json)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=YOUR_HOST;Port=5432;Database=postgres;Username=postgres;Password=YOUR_PASSWORD;SSL Mode=Require;"
  }
}
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the MIT License.

---

## 🙋 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing documentation in [ARCHITECTURE.md](ARCHITECTURE.md)
- Review backend docs in [backend/README.md](backend/README.md)

---

## 🎯 Roadmap

- [ ] Advanced scheduling and automation
- [ ] Analytics dashboard with engagement metrics
- [ ] Content calendar view
- [ ] Team collaboration features
- [ ] A/B testing for posts
- [ ] AI-powered content suggestions
- [ ] Mobile app for on-the-go management
- [ ] Integration with more platforms

---

**Happy Marketing! 🚀**
