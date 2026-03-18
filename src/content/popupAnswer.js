// @ts-check

(function attachPopup(global) {
  const VIEWPORT_PADDING = 12;
  const SELECTION_SPACING = 12;

  const root = document.createElement("div");
  root.className = "insta-ask-root";

  const popup = document.createElement("section");
  popup.className = "insta-ask-popup";

  const header = document.createElement("div");
  header.className = "insta-ask-popup-header";

  const title = document.createElement("span");
  title.className = "insta-ask-popup-title";
  title.textContent = "InstaAsk";

  const actions = document.createElement("div");
  actions.className = "insta-ask-popup-actions";

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "insta-ask-icon-button";
  copyButton.textContent = "Copy";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "insta-ask-icon-button";
  closeButton.textContent = "Close";

  actions.append(copyButton, closeButton);
  header.append(title, actions);

  const questionLabel = document.createElement("div");
  questionLabel.className = "insta-ask-field-label";
  questionLabel.textContent = "Question";

  const questionText = document.createElement("p");
  questionText.className = "insta-ask-question";

  const answerLabel = document.createElement("div");
  answerLabel.className = "insta-ask-field-label";
  answerLabel.textContent = "Answer";

  const answerText = document.createElement("p");
  answerText.className = "insta-ask-answer";

  popup.append(header, questionLabel, questionText, answerLabel, answerText);

  const toast = document.createElement("div");
  toast.className = "insta-ask-toast";

  root.append(popup, toast);
  document.body.appendChild(root);

  let lastAnswer = "";
  /** @type {number | null} */
  let toastTimer = null;
  /** @type {(() => DOMRect | null) | null} */
  let anchorRectProvider = null;
  let isPopupVisible = false;
  let repositionFrame = 0;
  /** @type {{ left: number; top: number } | null} */
  let manualPosition = null;
  let isDragging = false;
  let dragPointerId = -1;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  /**
   * @param {string} text
   * @returns {Promise<void>}
   */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (error) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
  }

  closeButton.addEventListener("click", () => {
    hide();
  });

  copyButton.addEventListener("click", async () => {
    if (!lastAnswer) {
      return;
    }

    try {
      await copyText(lastAnswer);
      showToast("Answer copied.");
    } catch (error) {
      showToast("Copy failed.");
    }
  });

  header.addEventListener("pointerdown", (event) => {
    const target = event.target;

    if (!(target instanceof Element) || target.closest(".insta-ask-icon-button")) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    const popupRect = popup.getBoundingClientRect();
    dragPointerId = event.pointerId;
    dragOffsetX = event.clientX - popupRect.left;
    dragOffsetY = event.clientY - popupRect.top;
    manualPosition = {
      left: popupRect.left,
      top: popupRect.top
    };
    isDragging = true;
    popup.classList.add("is-dragging");
    header.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  header.addEventListener("pointermove", (event) => {
    if (!isDragging || event.pointerId !== dragPointerId) {
      return;
    }

    const { width, height } = measurePopup();
    const left = clamp(
      event.clientX - dragOffsetX,
      VIEWPORT_PADDING,
      window.innerWidth - width - VIEWPORT_PADDING
    );
    const top = clamp(
      event.clientY - dragOffsetY,
      VIEWPORT_PADDING,
      window.innerHeight - height - VIEWPORT_PADDING
    );

    manualPosition = { left, top };
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
    popup.dataset.placement = "manual";
  });

  /**
   * @param {number} pointerId
   */
  function stopDragging(pointerId) {
    if (!isDragging || pointerId !== dragPointerId) {
      return;
    }

    isDragging = false;
    dragPointerId = -1;
    popup.classList.remove("is-dragging");

    if (header.hasPointerCapture(pointerId)) {
      header.releasePointerCapture(pointerId);
    }
  }

  header.addEventListener("pointerup", (event) => {
    stopDragging(event.pointerId);
  });

  header.addEventListener("pointercancel", (event) => {
    stopDragging(event.pointerId);
  });

  /**
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  function clamp(value, min, max) {
    if (max < min) {
      return min;
    }

    return Math.min(max, Math.max(min, value));
  }

  /**
   * @returns {{ width: number; height: number }}
   */
  function measurePopup() {
    const rect = popup.getBoundingClientRect();
    return {
      width: rect.width || popup.offsetWidth || 320,
      height: rect.height || popup.offsetHeight || 0
    };
  }

  /**
   * @param {DOMRect} rect
   */
  function positionPopup(rect) {
    const { width: popupWidth, height: popupHeight } = measurePopup();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const centeredLeft = rect.left + rect.width / 2 - popupWidth / 2;
    const clampedCenteredLeft = clamp(
      centeredLeft,
      VIEWPORT_PADDING,
      viewportWidth - popupWidth - VIEWPORT_PADDING
    );
    const centeredTop = rect.top + rect.height / 2 - popupHeight / 2;
    const clampedSideTop = clamp(
      centeredTop,
      VIEWPORT_PADDING,
      viewportHeight - popupHeight - VIEWPORT_PADDING
    );

    const enoughAbove = rect.top - SELECTION_SPACING - popupHeight >= VIEWPORT_PADDING;
    const enoughBelow =
      rect.bottom + SELECTION_SPACING + popupHeight <= viewportHeight - VIEWPORT_PADDING;
    const enoughRight =
      rect.right + SELECTION_SPACING + popupWidth <= viewportWidth - VIEWPORT_PADDING;
    const enoughLeft = rect.left - SELECTION_SPACING - popupWidth >= VIEWPORT_PADDING;

    let placement = "top";
    let left = clampedCenteredLeft;
    let top = rect.top - popupHeight - SELECTION_SPACING;

    if (enoughAbove) {
      placement = "top";
      top = rect.top - popupHeight - SELECTION_SPACING;
    } else if (enoughBelow) {
      placement = "bottom";
      top = rect.bottom + SELECTION_SPACING;
    } else if (enoughRight) {
      placement = "right";
      left = rect.right + SELECTION_SPACING;
      top = clampedSideTop - 24;
    } else if (enoughLeft) {
      placement = "left";
      left = rect.left - popupWidth - SELECTION_SPACING;
      top = clampedSideTop - 24;
    } else {
      const aboveTop = rect.top - popupHeight - SELECTION_SPACING;
      const belowTop = rect.bottom + SELECTION_SPACING;
      const visibleAbove = Math.max(0, aboveTop - VIEWPORT_PADDING);
      const visibleBelow = Math.max(0, viewportHeight - VIEWPORT_PADDING - belowTop - popupHeight);

      if (visibleAbove >= visibleBelow) {
        placement = "top";
        top = clamp(aboveTop, VIEWPORT_PADDING, viewportHeight - popupHeight - VIEWPORT_PADDING);
      } else {
        placement = "bottom";
        top = clamp(belowTop, VIEWPORT_PADDING, viewportHeight - popupHeight - VIEWPORT_PADDING);
      }
    }

    popup.style.left = `${clamp(left, VIEWPORT_PADDING, viewportWidth - popupWidth - VIEWPORT_PADDING)}px`;
    popup.style.top = `${clamp(top, VIEWPORT_PADDING, viewportHeight - popupHeight - VIEWPORT_PADDING)}px`;
    popup.dataset.placement = placement;
  }

  /**
   * @param {{ left: number; top: number }} position
   */
  function applyManualPosition(position) {
    const { width, height } = measurePopup();
    const left = clamp(position.left, VIEWPORT_PADDING, window.innerWidth - width - VIEWPORT_PADDING);
    const top = clamp(position.top, VIEWPORT_PADDING, window.innerHeight - height - VIEWPORT_PADDING);

    manualPosition = { left, top };
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
    popup.dataset.placement = "manual";
  }

  function refreshPosition() {
    repositionFrame = 0;

    if (!isPopupVisible) {
      return;
    }

    if (manualPosition) {
      applyManualPosition(manualPosition);
      return;
    }

    if (!anchorRectProvider) {
      return;
    }

    const rect = anchorRectProvider();

    if (!rect || (rect.width === 0 && rect.height === 0)) {
      return;
    }

    positionPopup(rect);
  }

  function scheduleRefreshPosition() {
    if (!isPopupVisible || repositionFrame !== 0) {
      return;
    }

    repositionFrame = window.requestAnimationFrame(refreshPosition);
  }

  function show() {
    isPopupVisible = true;
    popup.classList.add("is-visible");
  }

  function hide() {
    isPopupVisible = false;
    anchorRectProvider = null;
    manualPosition = null;
    isDragging = false;
    dragPointerId = -1;
    popup.classList.remove("is-visible");
    popup.classList.remove("is-dragging");

    if (repositionFrame !== 0) {
      window.cancelAnimationFrame(repositionFrame);
      repositionFrame = 0;
    }
  }

  /**
   * @param {string} message
   */
  function showToast(message) {
    if (toastTimer !== null) {
      window.clearTimeout(toastTimer);
    }

    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
      toastTimer = null;
    }, 2200);
  }

  window.addEventListener("scroll", scheduleRefreshPosition, true);
  window.addEventListener("resize", scheduleRefreshPosition);

  global.InstaAskAnswerPopup = {
    /**
     * @param {Node | null} node
     */
    containsNode(node) {
      return !!node && popup.contains(node);
    },

    getRect() {
      if (!isPopupVisible) {
        return null;
      }

      return popup.getBoundingClientRect();
    },

    /**
     * @param {{ question: string; rect: DOMRect; getAnchorRect?: () => DOMRect | null }} options
     */
    showLoading(options) {
      questionText.textContent = options.question;
      answerText.textContent = "Thinking…";
      copyButton.disabled = true;
      lastAnswer = "";
      anchorRectProvider = options.getAnchorRect || (() => options.rect);
      manualPosition = null;
      positionPopup(anchorRectProvider() || options.rect);
      show();
    },

    /**
     * @param {{ question: string; answer: string; rect: DOMRect; getAnchorRect?: () => DOMRect | null }} options
     */
    showAnswer(options) {
      questionText.textContent = options.question;
      answerText.textContent = options.answer;
      lastAnswer = options.answer;
      copyButton.disabled = false;
      anchorRectProvider = options.getAnchorRect || (() => options.rect);
      if (manualPosition) {
        applyManualPosition(manualPosition);
      } else {
        positionPopup(anchorRectProvider() || options.rect);
      }
      show();
    },

    hide,
    showToast
  };
})(globalThis);
