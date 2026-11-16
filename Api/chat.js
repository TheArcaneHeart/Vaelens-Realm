
export default async function handler(req, res) {
  const allowedOrigin = "https://thearcaneheart.github.io";

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only." });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "The storyteller's API key is not configured."
    });
  }

  const message = req.body?.message;
  let conversationId = req.body?.previousResponseId;

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      error: "Please enter a message."
    });
  }

  if (message.length > 4000) {
    return res.status(400).json({
      error: "Your message is too long."
    });
  }

  try {
    // Create a conversation for a new player session.
    if (!conversationId) {
      const newConversation = await fetch(
        "https://api.openai.com/v1/conversations",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({})
        }
      );

      const conversationData = await newConversation.json();

      if (!newConversation.ok) {
        throw new Error(
          conversationData.error?.message ||
          "Could not create a conversation."
        );
      }

      conversationId = conversationData.id;
    }

    // Ask the storyteller to respond.
    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-6-luna",
          conversation: conversationId,
          instructions: `
You are the AI storyteller of Vaelen's Realm.

The setting is a fantasy civilization with Renaissance
influences, inhabited by intelligent, human-sized furry folk.

The player is a newcomer to this world. Their choices
shape their identity, relationships, and adventures.

Support free-form roleplay and meaningful choices.
Let the player decide their own actions.
Never control the player's character without permission.
Treat all intelligent characters as people with dignity,
agency, and boundaries.

Write immersive, descriptive scenes.
Do not rush the story or force a predetermined ending.
          `,
          input: message,
          max_output_tokens: 700
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error?.message || "The storyteller could not respond."
      );
    }

    const reply = (data.output || [])
      .filter(item => item.type === "message")
      .flatMap(item => item.content || [])
      .filter(part => part.type === "output_text")
      .map(part => part.text)
      .join("\n");

    if (!reply) {
      throw new Error("The storyteller returned an empty response.");
    }

    return res.status(200).json({
      reply: reply,
      responseId: conversationId
    });

  } catch (error) {
    console.error("Storyteller error:", error);

    return res.status(500).json({
      error: "The storyteller encountered a problem. Please try again."
    });
  }
}
