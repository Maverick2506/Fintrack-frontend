/**
 * Streamed Ask FinTrack answers (AI6). POST /chat-advisor with Accept: text/event-stream answers with
 * Server-Sent Events once the server has run its tools:
 *   status {tool}   a tool is running (e.g. getSubscriptions)
 *   delta  {text}   the next piece of the answer
 *   reset  {}       drop the text so far (the model went on to call a tool)
 *   done   {reply, proposals}   the whole answer: shown in place of the pieces
 *   error  {error, status}
 * Anything that isn't a stream (an older server, a proxy that buffers, a 429 or 503 JSON answer) is
 * handled like the plain JSON route, and a stream that can't start falls back to one ordinary request.
 */

/** Feeds text chunks in; calls onEvent({ event, data }) for each complete event. Comments (": ping") are skipped. */
export const createSseParser = (onEvent) => {
  let buffer = "";
  const emit = (block) => {
    let event = "message";
    const data = [];
    for (const line of block.split("\n")) {
      if (!line || line.startsWith(":")) continue;
      const colon = line.indexOf(":");
      const field = colon === -1 ? line : line.slice(0, colon);
      const value = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");
      if (field === "event") event = value;
      else if (field === "data") data.push(value);
    }
    if (data.length === 0) return;
    const raw = data.join("\n");
    let parsed = raw;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Plain text data
    }
    onEvent({ event, data: parsed });
  };
  return {
    push(chunk) {
      buffer += String(chunk).replace(/\r\n?/g, "\n");
      let end = buffer.indexOf("\n\n");
      while (end !== -1) {
        emit(buffer.slice(0, end));
        buffer = buffer.slice(end + 2);
        end = buffer.indexOf("\n\n");
      }
    },
    flush() {
      if (buffer.trim()) emit(buffer);
      buffer = "";
    },
  };
};

const TOOL_STATUS = {
  simulatePurchase: "Running the numbers on that purchase…",
  getCategorySpending: "Adding up your spending…",
  getDebtPayoff: "Working out your debt payoff…",
  searchTransactions: "Searching your transactions…",
  compareMonths: "Comparing the months…",
  getSubscriptions: "Checking your subscriptions…",
  proposeTransaction: "Drafting it for Quick Add…",
};

/** What the panel says while a tool runs */
export const toolStatusText = (tool) => TOOL_STATUS[tool] || "Checking your numbers…";

// An error shaped like axios's, so the panel reads err.response.data.error either way
export const httpError = (status, data, message) => {
  const err = new Error(message || data?.error || `Request failed (${status})`);
  err.response = { status, data: data || {} };
  return err;
};

/**
 * Sends one chat message and reads the streamed answer. fetchImpl is fetch; fallback() sends the same
 * message the non-streaming way (axios, JSON). onText(fullTextSoFar) and onStatus(text) update the panel.
 * Resolves { reply, proposals }; rejects with err.response = { status, data } like axios.
 * signal: aborting it (the panel closed) cancels the request, so the server stops the answer too; the
 * promise then rejects with an AbortError and nothing falls back.
 */
export const readChatStream = async ({
  fetchImpl,
  url,
  token,
  body,
  onText = () => {},
  onStatus = () => {},
  fallback,
  onUnauthorized,
  signal,
}) => {
  if (typeof fetchImpl !== "function" || typeof TextDecoder === "undefined") return fallback();

  let res;
  try {
    res = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    // The stream couldn't start (no connection, blocked): try once the ordinary way
    return fallback();
  }

  const type = res.headers?.get?.("content-type") || "";
  if (!type.includes("text/event-stream")) {
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (res.ok && data && typeof data.reply === "string") return data; // a server that doesn't stream
    if (res.status === 401 && onUnauthorized) onUnauthorized();
    throw httpError(res.status, data);
  }

  let text = "";
  let result = null;
  let failure = null;
  const parser = createSseParser(({ event, data }) => {
    if (event === "delta" && typeof data?.text === "string") {
      text += data.text;
      onText(text);
    } else if (event === "reset") {
      text = "";
      onText(text);
    } else if (event === "status") {
      onStatus(toolStatusText(data?.tool));
    } else if (event === "done") {
      result = { reply: data?.reply || text, proposals: data?.proposals || [] };
    } else if (event === "error") {
      failure = httpError(data?.status || 500, { error: data?.error });
    }
  });

  try {
    if (res.body?.getReader) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        parser.push(decoder.decode(value, { stream: true }));
        if (result || failure) break;
      }
      parser.push(decoder.decode());
    } else {
      parser.push(await res.text());
    }
    parser.flush();
  } catch (err) {
    if (signal?.aborted) throw err;
    if (!result && !failure && !text) return fallback();
    if (!result && !failure) failure = httpError(0, { error: "The connection dropped mid-answer. Please ask again." });
  }

  if (failure) throw failure;
  if (result) return result;
  // The stream closed without an answer
  if (!text) return fallback();
  throw httpError(0, { error: "The connection dropped mid-answer. Please ask again." });
};
