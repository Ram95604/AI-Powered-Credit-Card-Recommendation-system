const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const axios = require("axios");
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
const TOGETHER_MODEL = "meta-llama/Llama-3-70b-chat-hf";

const MYSQL_CONFIG = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
};

const db = mysql.createConnection(MYSQL_CONFIG);

db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL database:", err.stack);
    return;
  }
  console.log("Successfully connected to MySQL database as id " + db.threadId);
});

const userData = {};

const askLLM = async (messages) => {
  try {
    const res = await axios.post(
      "https://api.together.xyz/v1/chat/completions",
      {
        model: TOGETHER_MODEL,
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${TOGETHER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (
      res.data &&
      res.data.choices &&
      res.data.choices.length > 0 &&
      res.data.choices[0].message
    ) {
      return res.data.choices[0].message.content;
    } else {
      console.error("Unexpected LLM API response structure:", res.data);
      throw new Error("LLM did not return a valid message.");
    }
  } catch (error) {
    console.error("❌ Error calling Together AI API:");
    if (error.response) {
      console.error("Data:", error.response.data);
      console.error("Status:", error.response.status);
      console.error("Headers:", error.response.headers);
    } else if (error.request) {
      console.error("Request:", error.request);
    } else {
      console.error("Error Message:", error.message);
    }
    throw new Error("Failed to get response from AI service.");
  }
};

app.post("/compare-cards", (req, res) => {
  const { cardNames } = req.body;

  if (!cardNames || !Array.isArray(cardNames) || cardNames.length === 0) {
    return res.status(400).json({ error: "Card names array is required." });
  }

  const sqlQuery = `SELECT card_name, issuer, joining_fee, annual_fee, reward_type, reward_rate,
         eligibility_criteria, spend_benefits, special_perks, credit_score_required, apply_link
  FROM credit_cards_dataset_merged
  WHERE ${cardNames.map(() => `card_name LIKE ?`).join(" OR ")}`;

  db.query(sqlQuery, cardNames, (err, results) => {
    if (err) {
      console.error("Database error during card comparison:", err);
      return res
        .status(500)
        .json({ error: "Failed to fetch card details for comparison." });
    }
    if (results.length === 0) {
      return res.status(404).json({
        error: "None of the selected cards were found in our database.",
      });
    }
    res.json(results);
  });
});

app.post("/chat", async (req, res) => {
  const { userId, message } = req.body;

  if (!userId || message === undefined) {
    return res
      .status(400)
      .json({ error: "userId and message are required." });
  }

  if (!userData[userId]) {
    userData[userId] = {
      income: null,
      creditScore: null,
      benefits: null,
      habits: null,
      step: 0,
    };
  }

  const lowerCaseMessage = message.toLowerCase();

  if (
    lowerCaseMessage.includes("list all cards") ||
    lowerCaseMessage.includes("tell all credit card names")
  ) {
    db.query(
      "SELECT card_name FROM credit_cards_dataset_merged ORDER BY card_name ASC",
      (dbErr, dbResults) => {
        if (dbErr) {
          return res.status(500).json({
            reply: "DB error listing cards.",
            recommended_cards_details: [],
          });
        }
        if (!dbResults || dbResults.length === 0) {
          return res.json({
            reply: "No cards in DB.",
            recommended_cards_details: [],
          });
        }
        const cardNames = dbResults.map((r) => r.card_name);
        const replyText = "Sure! Cards: \n- " + cardNames.join("\n- ");
        return res.json({
          reply: replyText,
          recommended_cards_details: [],
        });
      }
    );
    return;
  }

  const user = userData[userId];
  let replyMessage = "";

  if (user.step === 0) {
    replyMessage =
      "Hi! I am Credit Card Recommender. To recommend the best credit card for your needs, I'll need to ask you a few questions. What's your approximate monthly income (e.g., 50000 INR)?";
    user.step = 1;
    return res.json({ reply: replyMessage, recommended_cards_details: [] });
  } else if (user.step === 1) {
    user.income = message;
    replyMessage =
      "Thanks! What's your current credit score? (e.g., 750, or type 'unknown' if you don't know)";
    user.step = 2;
    return res.json({ reply: replyMessage, recommended_cards_details: [] });
  } else if (user.step === 2) {
    user.creditScore = message;
    replyMessage =
      "Great. What kind of benefits are you primarily looking for in a credit card? (e.g., cashback, travel rewards, lounge access, fuel surcharge waiver)";
    user.step = 3;
    return res.json({ reply: replyMessage, recommended_cards_details: [] });
  } else if (user.step === 3) {
    user.benefits = message;
    replyMessage =
      "Understood. And what are your major spending habits or categories? (e.g., online shopping, dining out, groceries, travel bookings, utility bills)";
    user.step = 4;
    return res.json({ reply: replyMessage, recommended_cards_details: [] });
  } else if (user.step === 4) {
    user.habits = message;
    db.query(
      "SELECT * FROM credit_cards_dataset_merged",
      async (dbErr, allCardsFromDB) => {
        if (dbErr) {
          return res.status(500).json({
            reply: "DB error",
            recommended_cards_details: [],
          });
        }

        const llmMessages = [
          {
            role: "system",
            content: `You are a credit card recommendation assistant. Based only on the list of cards provided, suggest the best 3–5 Indian credit cards matching user needs.

🔹 Format your response like this:
1. **Card Name**
   - Why it fits the user

2. **Card Name**
   - Why it fits the user

Only choose cards from the provided list. Do not generate your own.`,
          },
          {
            role: "user",
            content: `Here is the list of all available credit cards:\n${JSON.stringify(
              allCardsFromDB,
              null,
              2
            )}`,
          },
          {
            role: "user",
            content: `User profile: 
- Income: ${user.income}
- Credit Score: ${user.creditScore}
- Benefits wanted: ${user.benefits}
- Spending habits: ${user.habits}

Recommend 3–5 matching cards from the list in the format above.`,
          },
        ];

        try {
          const llmRawReply = await askLLM(llmMessages);
          let extractedCardNames = [];
          const regex = /\d\.\s\*\*(.*?)\*\*/g;
          let match;
          while ((match = regex.exec(llmRawReply)) !== null) {
            extractedCardNames.push(match[1].trim());
          }

          if (extractedCardNames.length === 0) {
            allCardsFromDB.forEach((dbCard) => {
              if (
                llmRawReply
                  .toLowerCase()
                  .includes(dbCard.card_name.toLowerCase())
              ) {
                if (!extractedCardNames.includes(dbCard.card_name)) {
                  extractedCardNames.push(dbCard.card_name);
                }
              }
            });
          }

          let structuredCardsForUI = [];

          if (extractedCardNames.length > 0) {
            const recommendedCardsDataFromDB = allCardsFromDB.filter(
              (dbCard) =>
                extractedCardNames.some(
                  (extractedName) =>
                    extractedName.toLowerCase() ===
                    dbCard.card_name.toLowerCase()
                )
            );

            structuredCardsForUI = recommendedCardsDataFromDB.map((dbCard) => ({
              card_name: dbCard.card_name,
              joining_fee: `₹${dbCard.joining_fee || "N/A"}`,
              annual_renewal_fee: `₹${dbCard.annual_fee || "N/A"}`,
              key_benefits: [
                dbCard.spend_benefits || "Details not specified.",
                dbCard.special_perks || "Perks not specified.",
              ].filter(
                (b) => b && !b.toLowerCase().includes("not specified")
              ),
              tags: dbCard.reward_type
                ? dbCard.reward_type
                    .split(/[;,]/)
                    .map((t) => t.trim())
                    .filter((t) => t)
                : [],
              image_url: `/images/${dbCard.card_name
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[+]/g, "plus")}.png`,
              issuer: dbCard.issuer,
            }));
          }

          res.json({
            reply: llmRawReply,
            recommended_cards_details: structuredCardsForUI,
          });
          delete userData[userId];
        } catch (llmErr) {
          console.error("LLM processing error:", llmErr);
          res.status(500).json({
            reply: "AI service error.",
            recommended_cards_details: [],
          });
        }
      }
    );
    return;
  } else {
    replyMessage = "Sorry, I'm a bit confused. Could we start over?";
    delete userData[userId];
    return res.json({
      reply: replyMessage,
      recommended_cards_details: [],
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
