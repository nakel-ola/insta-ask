// @ts-check

(function attachOptionsController(global) {
  const apiKeyInput = /** @type {HTMLInputElement} */ (document.querySelector("#options-api-key"));
  const saveButton = /** @type {HTMLButtonElement} */ (document.querySelector("#save-options-key"));
  const clearHistoryButton = /** @type {HTMLButtonElement} */ (document.querySelector("#clear-history"));
  const statusMessage = /** @type {HTMLSpanElement} */ (document.querySelector("#options-status"));
  const historyContainer = /** @type {HTMLDivElement} */ (document.querySelector("#options-history"));

  /**
   * @param {string} message
   */
  function setStatus(message) {
    statusMessage.textContent = message;
    window.clearTimeout(setStatus.timerId);
    setStatus.timerId = window.setTimeout(() => {
      statusMessage.textContent = "";
    }, 2200);
  }
  setStatus.timerId = 0;

  async function loadApiKey() {
    apiKeyInput.value = await global.InstaAskStorage.getApiKey();
  }

  async function renderHistory() {
    const entries = await global.InstaAskStorage.getHistory();
    const groups = global.InstaAskStorage.groupHistoryByUrl(entries);

    historyContainer.textContent = "";

    if (groups.length === 0) {
      const emptyState = document.createElement("div");
      emptyState.className = "empty";
      emptyState.textContent = "No history yet.";
      historyContainer.appendChild(emptyState);
      return;
    }

    for (const group of groups) {
      const details = document.createElement("details");
      details.open = true;

      const summary = document.createElement("summary");
      summary.textContent = group.displayUrl;

      const body = document.createElement("div");
      body.className = "group-body";

      for (const entry of group.entries) {
        const row = document.createElement("div");
        row.className = "entry";

        const question = document.createElement("div");
        question.className = "question";
        question.textContent = entry.question;

        const answer = document.createElement("div");
        answer.className = "answer";
        answer.textContent = `→ ${entry.answer}`;

        row.append(question, answer);
        body.appendChild(row);
      }

      details.append(summary, body);
      historyContainer.appendChild(details);
    }
  }

  saveButton.addEventListener("click", async () => {
    try {
      await global.InstaAskStorage.setApiKey(apiKeyInput.value);
      setStatus("API key saved.");
    } catch (error) {
      setStatus("Save failed.");
    }
  });

  clearHistoryButton.addEventListener("click", async () => {
    try {
      await global.InstaAskStorage.clearHistory();
      await renderHistory();
      setStatus("History cleared.");
    } catch (error) {
      setStatus("Clear failed.");
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }

    if (changes[global.InstaAskStorage.STORAGE_KEYS.apiKey]) {
      void loadApiKey();
    }

    if (changes[global.InstaAskStorage.STORAGE_KEYS.history]) {
      void renderHistory();
    }
  });

  void loadApiKey();
  void renderHistory();
})(globalThis);
