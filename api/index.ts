import { createApp } from "../src/app";

// Vercel's Node.js runtime treats a default-exported Express app as a request handler —
// no app.listen() here, that's only for the local/persistent server entrypoint (src/server.ts).
export default createApp();
