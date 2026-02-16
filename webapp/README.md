# M&A Timeline Generator (React)

This is the web version of the M&A Timeline Generator, built with React, Vite, and TypeScript.
It is a purely client-side application suitable for static hosting (GitHub Pages).

## 1. Installation

```bash
cd webapp
npm install
```

## 2. Development

Run the local dev server:

```bash
npm run dev
```

## 3. Building & Deployment

### GitHub Pages

We have pre-configured the `gh-pages` deployment script.

1. **Verify `homepage`**: Open `package.json` and ensure `"homepage": "."` works for your setup, OR change it to `https://<username>.github.io/<repo-name>`.
2. **Deploy**:
   ```bash
   npm run deploy
   ```
   This command will:
   - Build the project (`npm run build`).
   - Push the `dist` folder to a `gh-pages` branch on your repository.

### Manual Build

To create a production build manually:

```bash
npm run build
```
The output will be in the `dist` folder. You can host this folder on any static site provider (Vercel, Netlify, S3, etc.).
