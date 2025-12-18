# Deploying to Vercel

## Option 1: Using Vercel CLI

1. **Login to Vercel:**
   ```bash
   vercel login
   ```

2. **Deploy to production:**
   ```bash
   vercel --prod
   ```

   Or for a preview deployment:
   ```bash
   vercel
   ```

## Option 2: Using Vercel Dashboard (GitHub/GitLab/Bitbucket)

1. **Push your code to GitHub/GitLab/Bitbucket**
2. **Go to [vercel.com](https://vercel.com)**
3. **Click "Add New Project"**
4. **Import your repository**
5. **Vercel will auto-detect Vite and configure it automatically**
6. **Click "Deploy"**

## Option 3: Using Vercel Dashboard (Direct Upload)

1. **Go to [vercel.com](https://vercel.com)**
2. **Click "Add New Project"**
3. **Choose "Upload" option**
4. **Drag and drop your project folder**
5. **Vercel will build and deploy**

## Build Configuration

The project is already configured with:
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Framework:** Vite

Vercel will automatically detect these settings from `vercel.json`.

## Notes

- Make sure all dependencies are in `package.json` (they are ✅)
- The build will create a production-ready version in the `dist` folder
- Your app will be available at a URL like: `https://your-project-name.vercel.app`

