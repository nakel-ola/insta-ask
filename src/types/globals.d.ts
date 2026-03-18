export {};

declare global {
  type InstaAskHistoryEntry = {
    url: string;
    question: string;
    answer: string;
    timestamp: number;
  };

  interface InstaAskStorageApi {
    STORAGE_KEYS: {
      apiKey: string;
      history: string;
    };
    getApiKey(): Promise<string>;
    setApiKey(apiKey: string): Promise<void>;
    getHistory(): Promise<InstaAskHistoryEntry[]>;
    addHistoryEntry(entry: InstaAskHistoryEntry): Promise<InstaAskHistoryEntry[]>;
    clearHistory(): Promise<void>;
    formatDisplayUrl(url: string): string;
    groupHistoryByUrl(
      entries: InstaAskHistoryEntry[]
    ): Array<{ url: string; displayUrl: string; entries: InstaAskHistoryEntry[] }>;
  }

  interface InstaAskParsedAnswer {
    answer: string;
  }

  interface InstaAskOpenAIApi {
    askQuestion(params: { apiKey: string; question: string }): Promise<{
      answers: InstaAskParsedAnswer[];
      displayText: string;
    }>;
    parseStructuredAnswers(value: string): InstaAskParsedAnswer[];
  }

  interface InstaAskFloatingButtonApi {
    show(options: { rect: DOMRect; onClick: () => void }): void;
    updatePosition(rect: DOMRect): void;
    hide(): void;
  }

  interface InstaAskAnswerPopupApi {
    containsNode(node: Node | null): boolean;
    getRect(): DOMRect | null;
    showLoading(options: {
      question: string;
      rect: DOMRect;
      getAnchorRect?: () => DOMRect | null;
    }): void;
    showAnswer(options: {
      question: string;
      answer: string;
      rect: DOMRect;
      getAnchorRect?: () => DOMRect | null;
    }): void;
    hide(): void;
    showToast(message: string): void;
  }

  var InstaAskStorage: InstaAskStorageApi;
  var InstaAskOpenAI: InstaAskOpenAIApi;
  var InstaAskFloatingButton: InstaAskFloatingButtonApi;
  var InstaAskAnswerPopup: InstaAskAnswerPopupApi;

  function importScripts(...urls: string[]): void;
}
