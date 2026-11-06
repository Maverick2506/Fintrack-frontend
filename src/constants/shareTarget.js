// The PWA's Android share target: Share -> FinTrack opens /quick?title=...&text=... (GET).
// vite.config.js puts this in the manifest; shareTarget.test.js checks Quick Add reads the same params.
export const SHARE_TARGET = {
  action: "/quick",
  method: "GET",
  params: { text: "text", title: "title" },
};
