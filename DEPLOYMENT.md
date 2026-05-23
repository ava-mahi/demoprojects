# Deployment Guide - Nova Trade

## 🚨 Important: Two-Process Architecture

This platform requires **TWO separate services** to run:
1. **Next.js Web App** (port 3000)
2. **Socket.io Engine Server** (port 3001)

---

## ✅ Railway Deployment (Recommended)

### Step 1: Create PostgreSQL Database
1. Go to https://railway.app
2. Click **"New Project"** → **"Provision PostgreSQL"**
3. Copy the `DATABASE_URL` from the PostgreSQL service

### Step 2: Deploy Web Service
1. Click **"New"** → **"GitHub Repo"** → Select `demoprojects`
2. Add environment variables:
```env
DATABASE_URL=postgresql://... (from Step 1)
NEXTAUTH_SECRET=your-random-secret-min-32-chars
JWT_SECRET=another-random-secret-min-32-chars
JWT_REFRESH_SECRET=yet-another-random-secret
INTERNAL_API_SECRET=shared-secret-between-services
INTERNAL_API_URL=http://engine-service:3001
SOCKET_PORT=3001
NODE_ENV=production
```
3. Set **Start Command**: `npm run build && npm run start:web`
4. Deploy

### Step 3: Deploy Engine Service
1. In the same Railway project, click **"New"** → **"GitHub Repo"** → Select `demoprojects` again
2. Add same environment variables as Step 2
3. Set **Start Command**: `npm run start:engine`
4. Set **Port**: `3001`
5. Deploy

### Step 4: Update INTERNAL_API_URL
1. Copy the internal URL of the engine service (e.g., `engine-service.railway.internal:3001`)
2. Update `INTERNAL_API_URL` in the web service to: `http://engine-service.railway.internal:3001`
3. Redeploy web service

### Step 5: Run Database Migration
1. In Railway web service terminal, run:
```bash
npx prisma db push
npx prisma db seed
```

---

## 🔧 Alternative: Single Service (Simplified)

If you want to run both in one service:

### Railway Configuration
1. Create one service from GitHub
2. Add all environment variables
3. Set **Start Command**: `npm run build && npm run dev`
4. This runs both Next.js and Engine together using `concurrently`

**Note**: This works but is less scalable than separate services.

---

## 📋 Environment Variables Checklist

Required for both services:
- ✅ `DATABASE_URL` - PostgreSQL connection string
- ✅ `NEXTAUTH_SECRET` - Min 32 characters
- ✅ `JWT_SECRET` - Min 32 characters  
- ✅ `JWT_REFRESH_SECRET` - Min 32 characters
- ✅ `INTERNAL_API_SECRET` - Shared secret
- ✅ `INTERNAL_API_URL` - Engine service URL
- ✅ `SOCKET_PORT` - Default 3001
- ✅ `NODE_ENV` - Set to `production`

Optional:
- `NEXT_PUBLIC_SOCKET_URL` - Public WebSocket URL (auto-detected if not set)

---

## 🐛 Troubleshooting

### Build Failed
**Error**: "Failed to build an image"
**Solution**: 
1. Check all environment variables are set
2. Ensure `DATABASE_URL` is valid
3. Try setting build command: `npm install && npm run build`

### Database Connection Error
**Error**: "Can't reach database server"
**Solution**:
1. Verify `DATABASE_URL` format: `postgresql://user:pass@host:5432/dbname`
2. Check database is running
3. Run `npx prisma db push` to create tables

### WebSocket Not Connecting
**Error**: "WebSocket connection failed"
**Solution**:
1. Ensure engine service is running on port 3001
2. Check `INTERNAL_API_URL` points to engine service
3. Verify firewall allows WebSocket connections

### 500 Internal Server Error
**Solution**:
1. Check Railway logs for detailed error
2. Verify all environment variables are set
3. Ensure database tables exist (run migrations)

---

## 🚀 Quick Deploy Commands

```bash
# Generate secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Build locally to test
npm run build

# Run production locally
npm run start

# Database migrations
npx prisma db push
npx prisma db seed

# Check if services are running
curl http://localhost:3000/api/health
curl http://localhost:3001/health
```

---

## 📊 Post-Deployment Checklist

- [ ] Web service is running (check Railway logs)
- [ ] Engine service is running (check Railway logs)
- [ ] Database tables created (`npx prisma db push`)
- [ ] Seed data loaded (`npx prisma db seed`)
- [ ] Can access homepage
- [ ] Can register new user
- [ ] Can login
- [ ] WebSocket connects (check browser console)
- [ ] Charts load with live data
- [ ] Can place trades

---

## 🔗 Useful Links

- **Railway Dashboard**: https://railway.app/dashboard
- **Prisma Docs**: https://www.prisma.io/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Socket.io Docs**: https://socket.io/docs/v4/

---

## 💡 Production Tips

1. **Use separate services** for web and engine (better scaling)
2. **Enable auto-deploy** from main branch
3. **Set up health checks** for both services
4. **Monitor logs** regularly
5. **Use Redis** for session storage (optional, for scaling)
6. **Enable CORS** properly for production domain
7. **Use environment-specific** `.env` files
8. **Backup database** regularly

---

**Need help?** Check Railway logs or open an issue on GitHub!
