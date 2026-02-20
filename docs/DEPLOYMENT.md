# Deployment Guide

## Backend

1. Set environment variables:

```
NODE_ENV=production
PORT=5000
MONGO_URI=your_mongo_uri
JWT_SECRET=your_secret
FRONTEND_URL=https://dashboard.example.com
EXTENSION_ID=your-extension-id
EXTENSION_VERSION=1.0.0
```

2. Build and run:

```
cd sss-backend
npm install --production
npm start
```

## Dashboard

1. Set environment variables:

```
VITE_API_BASE_URL=https://api.example.com/api/v1
VITE_SOCKET_URL=https://api.example.com
```

2. Build:

```
cd sss-dashboard
npm install
npm run build
```

3. Serve `dist/` with a static host (Vercel, Nginx, etc).

## Extension

1. Build the extension:

```
cd sss-chrome-extension
npm install
npm run build
```

2. Create the CRX (see `sss-backend/src/extensions/README.md`).

3. Place the CRX file in `sss-backend/extensions/` and ensure
   `EXTENSION_VERSION` matches the manifest version.

4. The update manifest is served at `/api/v1/extension/updates.xml`.
