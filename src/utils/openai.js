// @ts-check

(function attachOpenAI(global) {
  const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
  const START_MARKER = "=== Answers Start ====";
  const END_MARKER = "=== Answers End ====";
  const ANSWER_HEADER_PATTERN = /^=== Ans (\d+) ===$/;
  const SYSTEM_PROMPT = `You are a strict answer formatter.

You must always return answers using this exact structure and nothing else:
${START_MARKER}
=== Ans 1 ===
<answer>
${END_MARKER}

If the provided text contains multiple questions, detect them automatically and answer them in the same order using:
${START_MARKER}
=== Ans 1 ===
<answer>
=== Ans 2 ===
<answer>
=== Ans 3 ===
<answer>
${END_MARKER}

Formatting rules:
- The first line must be exactly: ${START_MARKER}
- Each answer section header must be exactly: === Ans N ===
- Put only the answer on the line immediately after each answer header
- The last line must be exactly: ${END_MARKER}
- Do not add explanations
- Do not add commentary
- Do not add markdown
- Do not add bullets
- Do not add text before the start marker
- Do not add text after the end marker
- Keep every answer short and direct`;
  const USER_INSTRUCTION = `Analyze the provided text, detect every question automatically, and answer each question in the same order.

Return the output using the required format only:
${START_MARKER}
=== Ans 1 ===
<answer>
${END_MARKER}

If there are multiple questions, continue numbering from 1 in order:
${START_MARKER}
=== Ans 1 ===
<answer>
=== Ans 2 ===
<answer>
=== Ans 3 ===
<answer>
${END_MARKER}

Do not include explanations or any extra text outside the markers.`;

  /**
   * @param {string} value
   * @returns {string}
   */
  function normalizeResponse(value) {
    return value
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n")
      .trim();
  }

  /**
   * @typedef {{ answer: string }} ParsedAnswer
   */

  /**
   * @param {string} value
   * @returns {ParsedAnswer[]}
   */
  function parseStructuredAnswers(value) {
    const normalized = normalizeResponse(value);
    const lines = normalized.split("\n");

    if (lines[0] !== START_MARKER || lines[lines.length - 1] !== END_MARKER) {
      throw new Error("OpenAI returned an invalid answer format.");
    }

    /** @type {ParsedAnswer[]} */
    const answers = [];
    let lineIndex = 1;
    let expectedAnswerNumber = 1;

    while (lineIndex < lines.length - 1) {
      const headerLine = lines[lineIndex];
      const headerMatch = headerLine.match(ANSWER_HEADER_PATTERN);

      if (!headerMatch || Number(headerMatch[1]) !== expectedAnswerNumber) {
        throw new Error("OpenAI returned an invalid answer sequence.");
      }

      lineIndex += 1;

      /** @type {string[]} */
      const answerLines = [];

      while (lineIndex < lines.length - 1 && !ANSWER_HEADER_PATTERN.test(lines[lineIndex])) {
        if (lines[lineIndex].trim()) {
          answerLines.push(lines[lineIndex].trim());
        }

        lineIndex += 1;
      }

      const answer = answerLines.join(" ").trim();

      if (!answer) {
        throw new Error("OpenAI returned an empty answer section.");
      }

      answers.push({ answer });
      expectedAnswerNumber += 1;
    }

    if (answers.length === 0) {
      throw new Error("OpenAI returned no answer sections.");
    }

    return answers;
  }

  /**
   * @param {{ apiKey: string; question: string }} params
   * @returns {Promise<{ answers: ParsedAnswer[]; displayText: string }>}
   */
  async function askQuestion(params) {
    const question = params.question.trim();

    if (!params.apiKey.trim()) {
      throw new Error("Missing OpenAI API key.");
    }

    if (!question) {
      throw new Error("Missing highlighted text.");
    }

    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKey.trim()}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        max_tokens: 220,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          {
            role: "user",
            content: `${USER_INSTRUCTION}\n\n${question}`
          }
        ]
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage =
        typeof data?.error?.message === "string"
          ? data.error.message
          : "OpenAI request failed.";
      throw new Error(errorMessage);
    }

    const rawAnswer =
      typeof data?.choices?.[0]?.message?.content === "string"
        ? data.choices[0].message.content
        : "";
    const answers = parseStructuredAnswers(rawAnswer);
    const displayText = answers.map((entry) => entry.answer).join("\n");

    if (!displayText) {
      throw new Error("OpenAI returned an empty answer.");
    }

    return {
      answers,
      displayText
    };
  }

  global.InstaAskOpenAI = {
    askQuestion,
    parseStructuredAnswers
  };
})(globalThis);
