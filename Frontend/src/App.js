import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { v4 as uuid } from "uuid";
import Comparison from "./Comparision";
import "./App.css";

const userId = uuid();

function App() {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendedCards, setRecommendedCards] = useState([]);
  const [cardsToCompare, setCardsToCompare] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [showComparison, setShowComparison] = useState(false);

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, isLoading]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessageText = input;
    setChat((prev) => [...prev, { user: userMessageText }]);
    setInput("");
    setIsLoading(true);
    setRecommendedCards([]);
    setCardsToCompare([]);
    setComparisonData(null);
    setShowComparison(false);

    try {
      const res = await axios.post("https://creditcard-backend-production.up.railway.app/chat", {
        userId,
        message: userMessageText,
      });

      const assistantReply = res.data.reply;
      setChat((prev) => [...prev, { assistant: assistantReply }]);
      if (
        res.data.recommended_cards_details &&
        res.data.recommended_cards_details.length > 0
      ) {
        const cardNames = res.data.recommended_cards_details.map(
          (card) => card.card_name
        );
        console.log("Parsed cards from backend:", cardNames);
        setRecommendedCards(cardNames);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setChat((prev) => [
        ...prev,
        { assistant: "Error: Could not connect. Please try again later." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardSelectionForComparison = (cardName) => {
    setCardsToCompare((prev) =>
      prev.includes(cardName)
        ? prev.filter((c) => c !== cardName)
        : [...prev, cardName]
    );
  };

  const fetchComparisonData = async () => {
    if (cardsToCompare.length < 1) {
      alert("Please select at least one card to see details or compare.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await axios.post("https://creditcard-backend-production.up.railway.app/compare-cards", {
        cardNames: cardsToCompare,
      });
      console.log("Comparing these cards:", cardsToCompare);
      setComparisonData(res.data);
      setShowComparison(true);
      setRecommendedCards([]);
    } catch (err) {
      console.error("Error fetching comparison data:", err);
      alert("Error fetching comparison data. Please try again.");
      setComparisonData(null);
      setShowComparison(false);
    } finally {
      setIsLoading(false);
    }
  };

  const clearComparisonView = () => {
    setShowComparison(false);
    setComparisonData(null);
    setCardsToCompare([]);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>💳 Credit Card Advisor</h1>
      </header>
      <main className="main-content">
        {!showComparison ? (
          <>
            <div className="chat-box">
              {chat.map((msg, idx) => (
                <div
                  key={idx}
                  className={`chat-msg ${
                    msg.user ? "user-msg" : "assistant-msg"
                  }`}
                >
                  {msg.user && <p><b>You:</b> {msg.user}</p>}
                  {msg.assistant && (
                    <div>
                      <b>Bot:</b>
                      {msg.assistant
                        .split(/\n|(?=\d+\.\s)/)
                        .map((line, index) => (
                          <p key={index} style={{ margin: "5px 0" }}>
                            {line}
                          </p>
                        ))}
                    </div>
                  )}
                </div>
              ))}
              {isLoading && !showComparison && (
                <div className="chat-msg assistant-msg typing-indicator">
                  <p>
                    <b>Bot:</b> <i>typing...</i>
                  </p>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {recommendedCards.length > 0 && !isLoading && (
              <div className="recommendation-area">
                <h4>The bot mentioned these cards. Select to see details/compare:</h4>
                {recommendedCards.map((cardName) => (
                  <div key={cardName} className="card-selection">
                    <input
                      type="checkbox"
                      id={`compare-${cardName.replace(/\s+/g, "-")}`}
                      checked={cardsToCompare.includes(cardName)}
                      onChange={() => handleCardSelectionForComparison(cardName)}
                    />
                    <label htmlFor={`compare-${cardName.replace(/\s+/g, "-")}`}>
                      {cardName}
                    </label>
                  </div>
                ))}
                {cardsToCompare.length >= 1 && (
                  <button
                    onClick={fetchComparisonData}
                    disabled={isLoading}
                    className="compare-button"
                  >
                    {cardsToCompare.length === 1
                      ? "View Details"
                      : `Compare Selected (${cardsToCompare.length})`}
                  </button>
                )}
              </div>
            )}

            <div className="input-area">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ask about credit cards..."
                disabled={isLoading}
              />
              <button onClick={sendMessage} disabled={isLoading}>
                {isLoading ? "Thinking..." : "Send"}
              </button>
            </div>
          </>
        ) : (
          <Comparison
            comparisonData={comparisonData}
            onClearComparison={clearComparisonView}
          />
        )}
      </main>
      <footer className="app-footer">
        <p>AI Powered Credit Card Assistant</p>
      </footer>
    </div>
  );
}

export default App;
