
export default async function handler(req, res) {
  const allowedOrigins = [
    "https://thearcaneheart.github.io",
    "https://vaelens-realm-z3ih-git-indexhtml-thearcaneheart.vercel.app"
  ];

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "API key is not configured." });
  }

  try {
    const { message, previousResponseId } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Please enter a message." });
    }

    let conversationId = previousResponseId;

    if (!conversationId) {
      const conversation = await fetch(
        "https://api.openai.com/v1/conversations",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({})
        }
      );

      const data = await conversation.json();

      if (!conversation.ok) {
        throw new Error(data.error?.message || "Could not start conversation.");
      }

      conversationId = data.id;
    }

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-6-luna",
          conversation: conversationId,
          instructions:
            "You are the fantasy storyteller for Vaelen's Realm. " +
            "Create immersive, collaborative fantasy adventures. " +
            "Respect the user's choices and agency. Let the user shape the story.",
          input: message
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "The storyteller could not respond.");
    }

    return res.status(200).json({
      reply: data.output_text,
      responseId: conversationId
    });

  } catch (error) {
    console.error("Storyteller error:", error);
    return res.status(500).json({
      error: "The storyteller encountered a problem. Please try again."
    });
  }
}
