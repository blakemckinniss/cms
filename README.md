# SMS Generator Frontend

## Overview

This frontend is a modern, modular, browser-native ES module application for generating marketing SMS and email content. It is designed for maintainability, scalability, and best coding practices (2025 standards).

## Project Structure

```
sms-generator-frontend/
├── api.js         # API calls and hashing utilities
├── chat.js        # Chat UI and message logic
├── file.js        # File upload and file-related logic
├── index.html     # Main HTML entry point
├── main.js        # ES module entry point, wires up all modules
├── modal.js       # API key modal logic
├── settings.js    # Settings form and localStorage logic
├── style.css      # Main CSS (custom + Bootstrap overrides)
├── bootstrap.min.css
├── bootstrap.bundle.min.js
├── .gitignore     # Excludes local-dev-api/ from git
├── README.md      # This file
└── local-dev-api/ # Local dev API server (never commit)
```

## How to Run

1. **No build step required.** All code is browser-native ES modules.
2. **For local development with the API server:**
   - You **must serve `index.html` from localhost** (not open as `file://`).
   - Use a static server in `sms-generator-frontend/` (e.g., `npx serve .` or `python -m http.server 8080`).
   - The frontend will automatically use the local API at `http://localhost:3001` if opened from `http://localhost` or `http://127.0.0.1`.
3. **Deploy to GitHub Pages** or any static host for production. All `.js` files are loaded via `<script type="module" src="main.js"></script>` in `index.html`.
4. **No npm or Node.js required for frontend.** Do not use `require()` or npm packages directly.

## Local API Dev Server (for development only)

> **WARNING:** The local-dev-api/ directory contains a hardcoded API key for local development.  
> **Never commit this directory or its contents to git or any public repository.**

To use a local backend for development:

1. Go to `sms-generator-frontend/local-dev-api/`.
2. Run `npm install express` (no other dependencies required).
3. Start the server: `node server.js`
4. The server will run at [http://localhost:3001](http://localhost:3001) and will accept the hardcoded API key.
5. In your frontend, ensure the API base URL points to `http://localhost:3001` for local testing.
   - This is automatic if you serve `index.html` from `localhost` as described above.
   - You can override the API base URL by adding `?apiBase=http://localhost:3001` to the URL, or by setting `localStorage.smsGenApiBase`.

> **Troubleshooting:**
> If API calls fail or you see CORS errors, make sure you are not opening `index.html` as a `file://` URL.
> Always use a local server for development.

## Extending or Maintaining

- **Add new features** by creating new modules and importing them in `main.js`.
- **Keep files under 500 lines** for maintainability. Split logic into organized modules as needed.
- **Remove technical debt** regularly (unused code, variables, or files).
- **Update this README** and in-code comments after significant changes.
- **Follow accessibility and security best practices** (ARIA, input validation, etc.).

## Best Practices

- Use only browser-native JS and relative imports.
- Do not use Node.js or npm packages unless you add a build step.
- Keep code visually clean and well-documented.
- Test in all major browsers (latest Chrome, Firefox, Edge, Safari).

## Gotchas

- If you add new modules, ensure they are imported in `main.js` and referenced with correct relative paths.
- If you need to use npm packages, set up a build tool (e.g., Vite) and update this documentation.
- Never commit `local-dev-api/` or any file containing secrets or API keys.

---

_Last updated: 2025-04-15_