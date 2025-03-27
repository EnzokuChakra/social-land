# Deployment Guide for OG GRAM

This guide will help you deploy your OG GRAM application to various hosting platforms.

## Prerequisites

Before deploying, make sure to:

1. Fix all build errors by running:
   ```
   npm run build
   ```

2. Common errors to fix:
   - Replace all unescaped apostrophes (`'`) with `&apos;` in React components
   - Fix React Hooks rules violations (hooks must be called at the top level)
   - Fix import/export issues
   - Add missing dependencies to useEffect dependency arrays

## Option 1: Deploying to Vercel (Recommended)

Vercel is the easiest platform for deploying Next.js applications.

1. Create an account on [Vercel](https://vercel.com/)
2. Install the Vercel CLI:
   ```
   npm install -g vercel
   ```
3. Login to Vercel:
   ```
   vercel login
   ```
4. Deploy your application:
   ```
   vercel
   ```
5. Follow the prompts to configure your deployment
6. For production deployment:
   ```
   vercel --prod
   ```

### Environment Variables

Make sure to set up the following environment variables in the Vercel dashboard:

- `DATABASE_URL`: Your MySQL database connection string
- `NEXTAUTH_SECRET`: A random string for NextAuth.js
- `NEXTAUTH_URL`: Your application URL
- `NEXT_PUBLIC_BASE_URL`: Your application URL
- Other environment variables from your `.env` file

## Option 2: Deploying to a Traditional Web Host

If you're using a traditional web host like cPanel:

1. Build your application:
   ```
   npm run build
   ```

2. Create a Node.js environment on your web host (many hosts offer Node.js support)

3. Upload your project files to the server

4. Install dependencies:
   ```
   npm install --production
   ```

5. Start the application:
   ```
   npm start
   ```

6. Set up a process manager like PM2 to keep your application running:
   ```
   npm install -g pm2
   pm2 start npm --name "og-gram" -- start
   ```

## Option 3: Deploying with Docker

1. Create a `Dockerfile` in your project root:
   ```dockerfile
   FROM node:18-alpine AS base

   # Install dependencies only when needed
   FROM base AS deps
   WORKDIR /app
   COPY package.json package-lock.json ./
   RUN npm ci

   # Rebuild the source code only when needed
   FROM base AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   RUN npm run build

   # Production image, copy all the files and run next
   FROM base AS runner
   WORKDIR /app

   ENV NODE_ENV production

   RUN addgroup --system --gid 1001 nodejs
   RUN adduser --system --uid 1001 nextjs

   COPY --from=builder /app/public ./public
   COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
   COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

   USER nextjs

   EXPOSE 3000

   ENV PORT 3000

   CMD ["node", "server.js"]
   ```

2. Create a `.dockerignore` file:
   ```
   node_modules
   .next
   .git
   ```

3. Update your `next.config.js` to enable standalone output:
   ```js
   /** @type {import('next').NextConfig} */
   const nextConfig = {
     output: 'standalone',
   }

   module.exports = nextConfig
   ```

4. Build and run your Docker container:
   ```
   docker build -t og-gram .
   docker run -p 3000:3000 og-gram
   ```

## Database Setup

Your application requires a MySQL database. Make sure to:

1. Create a MySQL database on your hosting provider
2. Update the `DATABASE_URL` environment variable with your database connection string
3. Run the database migrations:
   ```
   npx prisma migrate deploy
   ```

## Troubleshooting

If you encounter issues during deployment:

1. Check the server logs for errors
2. Verify all environment variables are correctly set
3. Ensure your database is properly configured and accessible
4. Check if your hosting provider supports all the features your application needs

## Maintenance Mode

Your application includes a maintenance mode feature. To enable it:

1. Log in as a MASTER_ADMIN user
2. Go to the Admin Dashboard > Settings
3. Enable maintenance mode and set the estimated downtime

## Security Considerations

1. Always use HTTPS in production
2. Keep your dependencies updated
3. Regularly backup your database
4. Monitor your application for unusual activity

## Performance Optimization

1. Consider using a CDN for static assets
2. Optimize images and media files
3. Implement caching strategies
4. Use server-side rendering where appropriate 