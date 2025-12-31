# Authentication Environment Variables

## Required Environment Variables

### Backend (.env)

Add these to your backend `.env` file:

```bash
# JWT Secret Key - CHANGE THIS IN PRODUCTION
JWT_SECRET_KEY=your-very-secret-key-change-this-in-production-use-long-random-string

# User Credentials (Stateless Authentication)
# Format: USER_<username>=<password>:<role>
# Roles: individual, enterprise

# Example users:
USER_admin=admin123:enterprise
USER_analyst=analyst123:individual
USER_reviewer=reviewer456:individual
USER_manager=manager789:enterprise

# Optional: Environment setting
ENVIRONMENT=production  # Use 'dev' for development (bypasses auth checks)
```

### Frontend (.env.local)

Add these to your frontend `.env.local` file:

```bash
# API Base URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Optional: Node URLs for federated deployment
NEXT_PUBLIC_NODE1_URL=http://localhost:8001
NEXT_PUBLIC_NODE2_URL=http://localhost:8002
NEXT_PUBLIC_NODE3_URL=http://localhost:8003
NEXT_PUBLIC_NODE4_URL=http://localhost:8004
```

## User Roles and Permissions

### Individual Role
- **Permissions:**
  - `view_dashboard` - View dashboard and analytics
  - `upload_content` - Upload content for analysis
  - `view_analytics` - View analytics data

**Features:**
- Basic dashboard with key metrics
- Content upload and analysis
- View submissions and cases
- Basic analytics and charts
- Limited to core features

### Enterprise Role
- **Permissions:**
  - All Individual permissions
  - `view_superuser` - Access superuser features
  - `manage_submissions` - Manage all submissions
  - `export_data` - Export data and reports
  - `view_detailed_reports` - View detailed analysis reports

**Features:**
- Full dashboard with all metrics
- Advanced reports and system monitoring
- Data export capabilities
- Audit trail access
- Management console
- Priority support indicators
- Detailed analytics and insights

## Role-Based UI Differences

### Visual Indicators
- **Individual users** see:
  - Blue/cyan color scheme for their role badge (⭐ Basic)
  - Upgrade prompts for premium features
  - Limited menu items in sidebar
  - Basic plan footer in sidebar

- **Enterprise users** see:
  - Purple/pink color scheme for their role badge (👑 Pro)
  - Full access to all menu items
  - "Enterprise" badges on premium features
  - Pro plan footer in sidebar
  - Additional quick action cards

### Feature Access
- Individual users attempting to access enterprise features see an upgrade prompt
- Enterprise-only pages protected on both frontend and backend
- API endpoints validate permissions before allowing access

## Deployment Notes

### Vercel Deployment

1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add the following:
   - `JWT_SECRET_KEY` - Generate a strong random string
   - `USER_admin`, `USER_analyst`, etc. - Add user credentials
   - `ENVIRONMENT=production`

### Azure Deployment

1. In Azure App Service Configuration
2. Add Application Settings:
   - `JWT_SECRET_KEY` - Generate a strong random string
   - User credentials as separate settings
   - `ENVIRONMENT=production`

### Docker Deployment

Add to your `docker-compose.yml`:

```yaml
environment:
  - JWT_SECRET_KEY=your-secret-key
  - USER_admin=admin123:enterprise
  - USER_analyst=analyst123:individual
  - ENVIRONMENT=production
```

## Security Best Practices

1. **JWT Secret Key:**
   - Use a long random string (at least 32 characters)
   - Generate using: `openssl rand -hex 32`
   - Never commit to version control

2. **User Passwords:**
   - Use strong passwords in production
   - Consider using password hashing for enhanced security
   - Rotate credentials periodically

3. **Environment:**
   - Always set `ENVIRONMENT=production` in production
   - Development mode bypasses authentication checks

## Default Demo Credentials

For development/testing only:

- **Enterprise User:**
  - Username: `admin`
  - Password: `admin123`
  - Role: `enterprise`

- **Individual User:**
  - Username: `analyst`
  - Password: `analyst123`
  - Role: `individual`

**⚠️ Change these in production!**

## Adding New Users

To add a new user, simply add a new environment variable:

```bash
USER_newuser=password123:role
```

Where:
- `newuser` is the username (will be converted to lowercase)
- `password123` is the password
- `role` is either `individual` or `enterprise`

The system will automatically pick up new users on restart.

## Token Expiration

JWT tokens expire after 24 hours by default. Users will need to log in again after expiration.

To modify expiration, edit `app/auth/jwt_handler.py`:
```python
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
```

## Troubleshooting

### "Invalid token" errors
- Check that JWT_SECRET_KEY matches between frontend and backend
- Clear browser localStorage and try logging in again

### "Permission denied" errors
- Verify user role has the required permission
- Check `app/auth/users.py` ROLE_PERMISSIONS mapping

### Development mode not working
- Ensure `ENVIRONMENT=dev` is set in backend .env
- Restart the backend server
