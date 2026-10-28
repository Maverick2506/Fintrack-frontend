/* global process */
import { createSseParser, readChatStream, toolStatusText } from "./chatStream.js";

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  }
}

const sse = (events) => events.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join("");
// A Response whose body arrives in the given pieces
const streamed = (pieces, { status = 200, type = "text/event-stream; charset=utf-8" } = {}) => {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      for (const p of pieces) controller.enqueue(encoder.encode(p));
      controller.close();
    },
  });
  return new Response(body, { status, headers: { "Content-Type": type } });
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

const run = (response, extra = {}) => {
  const texts = [];
  const statuses = [];
  let fallbacks = 0;
  const promise = readChatStream({
    fetchImpl: typeof response === "function" ? response : async () => response,
    url: "http://api/chat-advisor",
    token: "t",
    body: { message: "hi", history: [] },
    onText: (t) => texts.push(t),
    onStatus: (s) => statuses.push(s),
    fallback: async () => {
      fallbacks++;
      return { reply: "Plain answer", proposals: [] };
    },
    ...extra,
  });
  return promise.then(
    (result) => ({ result, texts, statuses, fallbacks: () => fallbacks }),
    (error) => ({ error, texts, statuses, fallbacks: () => fallbacks })
  );
};

console.log("==================================================");
console.log("   ASK FINTRACK STREAMING UNIT TESTS (AI6)        ");
console.log("==================================================");

(async () => {
  console.log("\n--- Test 1: The event parser ---");
  const seen = [];
  const parser = createSseParser((e) => seen.push(e));
  parser.push(": stream open\n\nevent: delta\ndata: {\"text\":\"Hel");
  parser.push("lo\"}\r\n\r\nevent: done\ndata: {\"reply\":\"Hello\"}\n\n: ping\n\n");
  parser.flush();
  assert(seen.length === 2 && seen[0].event === "delta" && seen[0].data.text === "Hello" && seen[1].data.reply === "Hello", "Events split across chunks and CRLF lines are read; comments are skipped");

  console.log("\n--- Test 2: Text shows as it arrives, then the whole answer ---");
  const body = sse([
    ["status", { tool: "getSubscriptions" }],
    ["delta", { text: "You spend " }],
    ["delta", { text: "**$15.99**" }],
    ["done", { reply: "You spend **$15.99** a month.", proposals: [{ quickAddText: "8 coffee" }] }],
  ]);
  const ok = await run(streamed([body.slice(0, 40), body.slice(40, 90), body.slice(90)]));
  assert(JSON.stringify(ok.texts) === JSON.stringify(["You spend ", "You spend **$15.99**"]), `onText gets the text so far (got ${JSON.stringify(ok.texts)})`);
  assert(ok.statuses[0] === toolStatusText("getSubscriptions") && ok.statuses[0] === "Checking your subscriptions…", "A tool running shows what it is doing");
  assert(ok.result.reply === "You spend **$15.99** a month." && ok.result.proposals.length === 1 && ok.fallbacks() === 0, "done gives the full reply and the drafts");

  console.log("\n--- Test 3: reset drops text the model took back ---");
  const reset = await run(streamed([sse([["delta", { text: "Let me check. " }], ["reset", {}], ["delta", { text: "Done." }], ["done", { reply: "Done." }]])]));
  assert(reset.texts.join("|") === "Let me check. ||Done." && reset.result.reply === "Done.", "After reset the panel starts the text again");

  console.log("\n--- Test 4: Non-streaming fallback ---");
  const offline = await run(async () => {
    throw new TypeError("Failed to fetch");
  });
  assert(offline.result?.reply === "Plain answer" && offline.fallbacks() === 1, "If the stream can't start, one ordinary request answers");
  const plain = await run(json({ reply: "From JSON", proposals: [] }));
  assert(plain.result.reply === "From JSON" && plain.fallbacks() === 0, "A server that answers JSON (no stream) is read as before");
  const empty = await run(streamed([": stream open\n\n"]));
  assert(empty.result?.reply === "Plain answer" && empty.fallbacks() === 1, "A stream that closes before any text falls back");
  const noFetch = await run(null, { fetchImpl: undefined });
  assert(noFetch.result?.reply === "Plain answer", "No fetch in this browser: the ordinary request");

  console.log("\n--- Test 5: Errors keep their message and status ---");
  const capped = await run(json({ error: "You've reached today's limit of 100 AI requests.", code: "AI_DAILY_CAP" }, 429));
  assert(capped.error?.response?.status === 429 && capped.error.response.data.code === "AI_DAILY_CAP" && capped.fallbacks() === 0, "A 429 is not retried and keeps its code");
  const midError = await run(streamed([sse([["delta", { text: "Half" }], ["error", { error: "Failed to generate response from AI advisor.", status: 500 }]])]));
  assert(midError.error?.response?.status === 500 && /Failed to generate/.test(midError.error.response.data.error) && midError.fallbacks() === 0, "An error event becomes the error the panel shows (no second request)");
  const cut = await run(streamed([sse([["delta", { text: "Half an ans" }]])]));
  assert(/dropped mid-answer/.test(cut.error?.response?.data?.error || "") && cut.fallbacks() === 0, "A stream cut after text says so instead of asking again behind your back");
  let signedOut = false;
  const unauth = await run(json({ error: "Invalid or expired token" }, 401), { onUnauthorized: () => (signedOut = true) });
  assert(unauth.error?.response?.status === 401 && signedOut, "A 401 signs out like every other request");

  console.log("\n--- Test 6: Closing the panel stops the answer ---");
  const controller = new AbortController();
  let fetchSignal = null;
  const closing = run(
    async (url, opts) => {
      fetchSignal = opts.signal;
      // Like fetch: aborting the signal errors the body that is still arriving
      const slowBody = new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode(sse([["delta", { text: "Start" }]])));
          opts.signal.addEventListener("abort", () => c.error(new DOMException("Aborted", "AbortError")));
        },
      });
      return new Response(slowBody, { status: 200, headers: { "Content-Type": "text/event-stream" } });
    },
    { signal: controller.signal, onText: () => controller.abort() }
  );
  const closed = await closing;
  assert(fetchSignal === controller.signal, "The request carries the panel's abort signal");
  assert(closed.error && closed.fallbacks() === 0, "After closing, nothing is retried the ordinary way");

  console.log("\nAll chatStream tests passed.");
})();
