# YORSA Runbook: Production Deployment Guide

## 1. Deployment Checklist Overview

| Layer | Service / Host | Build Command | Output / Start Command |
| :--- | :--- | :--- | :--- |
| **Backend** | Render / AWS EC2 / Railway | `npm install` | `npm run start` (`node src/app.js`) |
| **Frontend** | Vercel / Netlify / Render Static | `npm run build` | `build` directory |
| **Database** | MongoDB Atlas Cluster | Managed | Cloud URI with IP Access List |

---

## 2. Backend Deployment (e.g. Render Web Service)

1. **Connect Repository**: Link your GitHub repository in the Render Dashboard.
2. **Environment Configuration**:
   - **Environment**: `Node`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
3. **Environment Variables**:
   - `PORT`: `8000` (or host assigned)
   - `MONGO_URI`: `mongodb+srv://<user>:<password>@cluster.mongodb.net/Yorsa?retryWrites=true&w=majority`
   - `HF_API_TOKEN`: `hf_...`
4. **MongoDB Atlas IP Whitelisting**:
   - Ensure `0.0.0.0/0` (or your host's outbound IP range) is added to the MongoDB Atlas Network Access whitelist.

---

## 3. Frontend Deployment (e.g. Vercel or Render Static Site)

1. **Root Directory**: `frontend`
2. **Build Command**: `npm run build`
3. **Publish Directory**: `build`
4. **Environment Settings**:
   - Update `frontend/src/environment.js` to ensure production points to your deployed backend domain:
   ```javascript
   const server = isLocalhost 
     ? "http://localhost:8000" 
     : "https://your-backend-service.onrender.com";
   ```
5. **SPA Redirect Rule**:
   - For Netlify: include `/* /index.html 200` in `public/_redirects`.
   - For Vercel: ensure `vercel.json` rewrites all paths to `/index.html` so client-side routing (`/meeting/:roomId`) functions properly.

---

## 4. Post-Deployment Verification
- Navigate to `/api/health` on your deployed backend domain to verify `200 OK`.
- Create a room on the frontend, copy the shareable link (`/meeting/yorsa-xxxx-xxxx`), and join from a secondary browser or mobile device.
- Test Host Controls (Mute All) and trigger "Generate Summary" to confirm live AI synthesis in production.
