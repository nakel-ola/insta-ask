// @ts-check

(function attachHighlightController(global) {
  /** @type {{ text: string; range: Range; rect: DOMRect } | null} */
  let selectionState = null;
  let refreshScheduled = false;
  let requestSequence = 0;

  /**
   * @param {Node | null} node
   * @returns {boolean}
   */
  function isInsideExtensionUi(node) {
    if (!node) {
      return false;
    }

    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;

    if (!element) {
      return false;
    }

    if (element.closest(".insta-ask-root")) {
      return true;
    }

    return !!global.InstaAskAnswerPopup?.containsNode?.(node);
  }

  /**
   * @param {unknown} message
   * @returns {Promise<{ ok: boolean; answer?: string; error?: string }>}
   */
  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        resolve(response);
      });
    });
  }

  /**
   * @returns {{ text: string; range: Range; rect: DOMRect } | null}
   */
  function getSelectionState() {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return null;
    }

    const range = selection.getRangeAt(0);

    if (isInsideExtensionUi(range.commonAncestorContainer)) {
      return null;
    }

    const text = selection.toString().trim();

    if (!text) {
      return null;
    }

    const selectionRange = range.cloneRange();
    const rect = selectionRange.getBoundingClientRect();

    if (!rect || (rect.width === 0 && rect.height === 0)) {
      return null;
    }

    return { text, range: selectionRange, rect };
  }

  function clearSelectionUi() {
    global.InstaAskFloatingButton.hide();
  }

  function refreshSelection() {
    refreshScheduled = false;

    const nextSelectionState = getSelectionState();

    if (!nextSelectionState) {
      selectionState = null;
      clearSelectionUi();
      return;
    }

    selectionState = nextSelectionState;
    global.InstaAskFloatingButton.show({
      rect: nextSelectionState.rect,
      onClick: askSelection
    });
  }

  function scheduleRefresh() {
    if (refreshScheduled) {
      return;
    }

    refreshScheduled = true;
    window.requestAnimationFrame(refreshSelection);
  }

  function updateButtonPosition() {
    if (!selectionState) {
      return;
    }

    const rect = selectionState.range.getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0) {
      clearSelectionUi();
      return;
    }

    selectionState.rect = rect;
    global.InstaAskFloatingButton.updatePosition(rect);
  }

  async function askSelection() {
    if (!selectionState || !selectionState.text.trim()) {
      global.InstaAskAnswerPopup.showToast("Select a question first.");
      return;
    }

    const question = selectionState.text.trim();
    const anchorRange = selectionState.range.cloneRange();
    const getAnchorRect = () => anchorRange.getBoundingClientRect();
    const rect = getAnchorRect();
    const currentRequest = ++requestSequence;

    global.InstaAskFloatingButton.hide();
    global.InstaAskAnswerPopup.showLoading({
      question,
      rect,
      getAnchorRect
    });

    try {
      const response = await sendMessage({
        type: "INSTA_ASK_ASK",
        question,
        url: window.location.href
      });

      if (!response || !response.ok || !response.answer) {
        throw new Error(response?.error || "Unable to answer that selection.");
      }

      if (currentRequest !== requestSequence) {
        return;
      }

      global.InstaAskAnswerPopup.showAnswer({
        question,
        answer: response.answer,
        rect,
        getAnchorRect
      });
    } catch (error) {
      if (currentRequest !== requestSequence) {
        return;
      }

      global.InstaAskAnswerPopup.hide();
      global.InstaAskAnswerPopup.showToast(
        error instanceof Error ? error.message : "Unable to answer that selection."
      );
    }
  }

  document.addEventListener("selectionchange", scheduleRefresh, true);
  document.addEventListener("mouseup", scheduleRefresh, true);
  document.addEventListener("keyup", scheduleRefresh, true);
  window.addEventListener("scroll", updateButtonPosition, true);
  window.addEventListener("resize", updateButtonPosition, true);
})(globalThis);
