// @ts-check

(function attachFloatingButton(global) {
  const root = document.createElement("div");
  root.className = "insta-ask-root";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "insta-ask-button";
  button.textContent = "Ask";

  root.appendChild(button);
  document.documentElement.appendChild(root);

  /** @type {(() => void) | null} */
  let clickHandler = null;

  button.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

  button.addEventListener("click", (event) => {
    event.preventDefault();

    if (clickHandler) {
      clickHandler();
    }
  });

  /**
   * @param {DOMRect} rect
   */
  function positionButton(rect) {
    const centerX = rect.left + rect.width / 2;
    const prefersBottom = rect.top < 52;

    button.style.left = `${Math.min(window.innerWidth - 20, Math.max(20, centerX))}px`;
    button.style.top = prefersBottom ? `${rect.bottom + 10}px` : `${rect.top - 10}px`;
    button.dataset.position = prefersBottom ? "bottom" : "top";
  }

  global.InstaAskFloatingButton = {
    /**
     * @param {{ rect: DOMRect; onClick: () => void }} options
     */
    show(options) {
      clickHandler = options.onClick;
      positionButton(options.rect);
      button.classList.add("is-visible");
    },

    /**
     * @param {DOMRect} rect
     */
    updatePosition(rect) {
      if (!button.classList.contains("is-visible")) {
        return;
      }

      positionButton(rect);
    },

    hide() {
      clickHandler = null;
      button.classList.remove("is-visible");
    }
  };
})(globalThis);
