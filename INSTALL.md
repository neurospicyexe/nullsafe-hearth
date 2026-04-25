# Installing Hearth

> **Tech-savvy?** The quick version is in [README.md](./README.md). This guide is for everyone else.

## What is Hearth, in plain English?

Hearth is a web dashboard — a website you open in your browser to see what's happening with your companions. It shows sessions, moods, tasks, letters, growth journals, and more.

It's built with Next.js and designed to deploy on **Vercel** (free tier). You can also run it on your own computer for development, but a Vercel deployment is what you'll actually use day to day.

**You need Halseth running before Hearth will display data.**

---

## Local computer vs. Vercel — which should I use?

**Local (for development/testing):**
Run Hearth on your own machine and open it at `localhost:3000`. Useful for making changes and testing. Goes offline when your computer is off.

**Vercel (for real use):**
Vercel hosts Hearth as a website at a URL like `https://hearth.vercel.app`. Free tier, 24/7, accessible from anywhere. This is what you'll use normally.

---

## What you need

- **Halseth deployed** and its URL + `ADMIN_SECRET` ready
- **A Vercel account** (free) — [vercel.com](https://vercel.com) — sign up with GitHub
- **Node.js** — [nodejs.org](https://nodejs.org) (LTS version)
- **Git** — [git-scm.com](https://git-scm.com)

---

## Option A: Local development

### 1. Get the code

```bash
git clone https://github.com/neurospicyexe/hearth.git
cd hearth
npm install
```

### 2. Create your environment file

```bash
cp .env.local.example .env.local
```

> If there's no `.env.local.example`, create `.env.local` manually.

Open `.env.local` and fill in:

```
HALSETH_URL=https://halseth.neurospicyexe.workers.dev
HALSETH_SECRET=your-admin-secret
DASHBOARD_SECRET=pick-a-passphrase-for-the-login-page
SYSTEM_OWNER=your-name-lowercase
```

### 3. Start

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll see a login page — use the `DASHBOARD_SECRET` you just set.

---

## Option B: Vercel deployment (recommended)

### 1. Push the code to GitHub

If you haven't already, create a GitHub repository and push this code to it.

### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New → Project**
3. Import your GitHub repository
4. Vercel will detect it's a Next.js project automatically

### 3. Set environment variables in Vercel

Before clicking Deploy, go to **Environment Variables** and add:

| Name | Value |
|------|-------|
| `HALSETH_URL` | Your Halseth URL |
| `HALSETH_SECRET` | Your Halseth `ADMIN_SECRET` |
| `DASHBOARD_SECRET` | A passphrase for your login page |
| `SYSTEM_OWNER` | Your name, lowercase |

### 4. Deploy

Click **Deploy**. Vercel will build and give you a URL. That's your dashboard.

### 5. Log in

Open your Vercel URL. You'll see a login page — use your `DASHBOARD_SECRET`. The dashboard cookie lasts until you clear it.

---

## Updating Hearth

When you push new commits to GitHub, Vercel redeploys automatically.

For local updates:
```bash
git pull
npm install  # if dependencies changed
```

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| Blank page after login | Check browser console for CSP errors. Make sure `HALSETH_URL` is correct. |
| "Not authorized" from Halseth | `HALSETH_SECRET` doesn't match the `ADMIN_SECRET` in Cloudflare |
| Dashboard shows empty sections | Halseth might not have data yet. Check that Halseth is running and bootstrapped. |
| Login page keeps appearing | Your browser is blocking the session cookie. Try a different browser or disable strict cookie settings. |
| Vercel build fails | Check the build logs in Vercel dashboard — usually a missing env var |
