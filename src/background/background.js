// @ts-check

importScripts("../utils/storage.js", "../utils/openai.js");

/**
 * @typedef {{
 *   type: string;
 *   question?: string;
 *   url?: string;
 * }} AskMessage
 */

/**
 * @param {AskMessage} message
 * @param {chrome.runtime.MessageSender} sender
 * @returns {Promise<{ answer: string }>}
 */
async function handleAsk(message, sender) {
  const question = typeof message.question === "string" ? message.question.trim() : "";

  if (!question) {
    throw new Error("Select a question first.");
  }

  const apiKey = await globalThis.InstaAskStorage.getApiKey();

  if (!apiKey) {
    throw new Error("Add your OpenAI API key in the extension popup.");
  }

  const result = await globalThis.InstaAskOpenAI.askQuestion({
    apiKey,
    question
  });

  await globalThis.InstaAskStorage.addHistoryEntry({
    url: typeof message.url === "string" && message.url ? message.url : sender.tab?.url || "",
    question,
    answer: result.displayText,
    timestamp: Math.floor(Date.now() / 1000)
  });

  return { answer: result.displayText };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "INSTA_ASK_ASK") {
    return undefined;
  }

  handleAsk(/** @type {AskMessage} */ (message), sender)
    .then((result) => sendResponse({ ok: true, answer: result.answer }))
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Unable to answer that selection."
      });
    });

  return true;
});
