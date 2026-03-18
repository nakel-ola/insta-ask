// @ts-check

(function attachPopupController(global) {
  const apiKeyInput = /** @type {HTMLInputElement} */ (document.querySelector("#api-key"));
  const saveButton = /** @type {HTMLButtonElement} */ (document.querySelector("#save-api-key"));
  const openOptionsButton = /** @type {HTMLButtonElement} */ (document.querySelector("#open-options"));
  const historyList = /** @type {HTMLDivElement} */ (document.querySelector("#history-list"));
  const statusMessage = /** @type {HTMLSpanElement} */ (document.querySelector("#status-message"));

  /**
   * @param {string} text
   * @returns {Promise<void>}
   */
  async function copyText(text) {
    await navigator.clipboard.writeText(text);
  }

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

  async function renderHistory() {
    const entries = await global.InstaAskStorage.getHistory();
    const groups = global.InstaAskStorage.groupHistoryByUrl(entries);

    historyList.textContent = "";

    if (groups.length === 0) {
      const emptyState = document.createElement("div");
      emptyState.className = "empty-state";
      emptyState.textContent = "No answered questions yet.";
      historyList.appendChild(emptyState);
      return;
    }

    for (const group of groups) {
      const details = document.createElement("details");
      details.className = "history-group";
      details.open = true;

      const summary = document.createElement("summary");
      const summaryRow = document.createElement("div");
      summaryRow.className = "history-summary";

      const label = document.createElement("span");
      label.textContent = group.displayUrl;

      const count = document.createElement("span");
      count.className = "history-count";
      count.textContent = `${group.entries.length} answer${group.entries.length === 1 ? "" : "s"}`;

      summaryRow.append(label, count);
      summary.appendChild(summaryRow);

      const body = document.createElement("div");
      body.className = "history-group-body";

      for (const entry of group.entries) {
        const item = document.createElement("div");
        item.className = "history-item";

        const content = document.createElement("div");
        content.className = "history-content";

        const question = document.createElement("div");
        question.className = "history-question";
        question.textContent = entry.question;

        const answer = document.createElement("div");
        answer.className = "history-answer";
        answer.textContent = `→ ${entry.answer}`;

        content.append(question, answer);

        const copyColumn = document.createElement("div");
        copyColumn.className = "history-copy-column";

        const copyButton = document.createElement("button");
        copyButton.type = "button";
        copyButton.className = "copy-button";
        copyButton.textContent = "Copy";
        copyButton.addEventListener("click", async () => {
          try {
            await copyText(entry.answer);
            setStatus("Answer copied.");
          } catch (error) {
            setStatus("Copy failed.");
          }
        });

        copyColumn.appendChild(copyButton);
        item.append(content, copyColumn);
        body.appendChild(item);
      }

      details.append(summary, body);
      historyList.appendChild(details);
    }
  }

  async function loadApiKey() {
    const apiKey = await global.InstaAskStorage.getApiKey();
    apiKeyInput.value = apiKey;
  }

  saveButton.addEventListener("click", async () => {
    try {
      await global.InstaAskStorage.setApiKey(apiKeyInput.value);
      setStatus("API key saved.");
    } catch (error) {
      setStatus("Save failed.");
    }
  });

  openOptionsButton.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
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
