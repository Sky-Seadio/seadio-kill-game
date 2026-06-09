# Deployment Instructions

## Prerequisites
1. GitHub account with repository: https://github.com/Sky-Seadio/seadio-kill-game
2. Render account (free tier)
3. MongoDB Atlas account (free tier)

## Steps

### 1. Set up MongoDB Atlas
1. Go to https://www.mongodb.com/atlas
2. Create a free cluster
3. Get the connection string
4. Replace `<password>` with your database user password

### 2. Deploy to Render
1. Go to https://render.com
2. Sign in with GitHub
3. Click "New Web Service"
4. Connect repository: Sky-Seadio/seadio-kill-game
5. Configure:
   - Name: seadio-kill
   - Environment: Node
   - Build Command: npm install
   - Start Command: npm start
6. Add Environment Variables:
   - NODE_ENV: production
   - MONGODB_URI: (your MongoDB Atlas connection string)
7. Click "Create Web Service"

### 3. Verify Deployment
1. Wait for deployment to complete
2. Open the provided URL (e.g., https://seadio-kill.onrender.com)
3. Test the game functionality

## Environment Variables
- `PORT` - Server port (default: 3000, Render sets this automatically)
- `MONGODB_URI` - MongoDB connection string
- `NODE_ENV` - Environment (production/development)
