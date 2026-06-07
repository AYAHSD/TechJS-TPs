# Book Tracker

Simple TypeScript + Express + MongoDB app to track reading. Frontend is a Tailwind-styled HTML page served from `public/`.

Setup:

1. Copy `.env.example` to `.env` and set `MONGODB_URI`.
2. Install dependencies:

```bash
npm install
```

3. Run in development:

```bash
npm run dev
```

The server will serve the frontend at `http://localhost:4000` and provide API at `/api/books`.
