// @ts-check

(function attachStorage(global) {
  const STORAGE_KEYS = Object.freeze({
    apiKey: "instaAskOpenAIApiKey",
    history: "instaAskHistory"
  });

  const HISTORY_LIMIT = 250;

  /**
   * @template T
   * @param {string|string[]|Object<string, unknown>} keys
   * @returns {Promise<T>}
   */
  function storageGet(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        resolve(/** @type {T} */ (result));
      });
    });
  }

  /**
   * @param {Object<string, unknown>} value
   * @returns {Promise<void>}
   */
  function storageSet(value) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(value, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        resolve();
      });
    });
  }

  /**
   * @typedef {{
   *   url: string;
   *   question: string;
   *   answer: string;
   *   timestamp: number;
   * }} HistoryEntry
   */

  /**
   * @returns {Promise<string>}
   */
  async function getApiKey() {
    /** @type {{ instaAskOpenAIApiKey?: string }} */
    const result = await storageGet([STORAGE_KEYS.apiKey]);
    const apiKey = result[STORAGE_KEYS.apiKey];

    return typeof apiKey === "string" ? apiKey : "";
  }

  /**
   * @param {string} apiKey
   * @returns {Promise<void>}
   */
  async function setApiKey(apiKey) {
    await storageSet({
      [STORAGE_KEYS.apiKey]: apiKey.trim()
    });
  }

  /**
   * @returns {Promise<HistoryEntry[]>}
   */
  async function getHistory() {
    /** @type {{ instaAskHistory?: HistoryEntry[] }} */
    const result = await storageGet([STORAGE_KEYS.history]);
    const storedHistory = result[STORAGE_KEYS.history];
    const history = Array.isArray(storedHistory) ? storedHistory : [];

    return history
      .filter((entry) => entry && typeof entry.question === "string" && typeof entry.answer === "string")
      .sort((left, right) => right.timestamp - left.timestamp);
  }

  /**
   * @param {HistoryEntry} entry
   * @returns {Promise<HistoryEntry[]>}
   */
  async function addHistoryEntry(entry) {
    const history = await getHistory();
    const nextHistory = [entry, ...history].slice(0, HISTORY_LIMIT);

    await storageSet({
      [STORAGE_KEYS.history]: nextHistory
    });

    return nextHistory;
  }

  /**
   * @returns {Promise<void>}
   */
  async function clearHistory() {
    await storageSet({
      [STORAGE_KEYS.history]: []
    });
  }

  /**
   * @param {string} url
   * @returns {string}
   */
  function formatDisplayUrl(url) {
    try {
      const parsedUrl = new URL(url);
      const path = parsedUrl.pathname === "/" ? "" : parsedUrl.pathname.replace(/\/$/, "");
      return `${parsedUrl.host}${path}`;
    } catch (error) {
      return url || "Unknown page";
    }
  }

  /**
   * @param {string} url
   * @returns {string}
   */
  function normalizeGroupUrl(url) {
    try {
      const parsedUrl = new URL(url);
      return `${parsedUrl.origin}${parsedUrl.pathname}`;
    } catch (error) {
      return url || "Unknown page";
    }
  }

  /**
   * @param {HistoryEntry[]} entries
   * @returns {{ url: string; displayUrl: string; entries: HistoryEntry[] }[]}
   */
  function groupHistoryByUrl(entries) {
    const groups = [];
    const groupsByUrl = new Map();

    for (const entry of entries) {
      const key = normalizeGroupUrl(entry.url);

      if (!groupsByUrl.has(key)) {
        const group = {
          url: key,
          displayUrl: formatDisplayUrl(key),
          /** @type {HistoryEntry[]} */
          entries: []
        };

        groupsByUrl.set(key, group);
        groups.push(group);
      }

      const group = groupsByUrl.get(key);

      if (group) {
        group.entries.push(entry);
      }
    }

    return groups;
  }

  global.InstaAskStorage = {
    STORAGE_KEYS,
    getApiKey,
    setApiKey,
    getHistory,
    addHistoryEntry,
    clearHistory,
    formatDisplayUrl,
    groupHistoryByUrl
  };
})(globalThis);
