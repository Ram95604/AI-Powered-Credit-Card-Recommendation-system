# AI-Powered Credit Card Recommendation System

A full-stack web application that recommends the best credit card to users based on their income, credit score, preferred benefits, and spending habits — powered by Together AI's LLM and a MySQL-backed card database.

---

## Features

-  AI-powered conversational assistant using Together AI API
-  End-to-end credit card recommendation based on user profile
-  Real-time chat interface with context retention
-  Compare selected credit cards side-by-side
-  Responsive frontend built with React.js
-  Backend with Node.js, Express, and MySQL
-  Fully containerized and deployable (Vercel + Railway)

---

## How It Works

1. User interacts with a chatbot to answer a few profile-based questions (income, credit score, etc.)
2. User data is processed, and available credit cards from the database are passed to the LLM.
3. The LLM selects and explains 3–5 best-fit cards using GPT-style reasoning.
4. The app fetches card details from MySQL and returns them as structured UI cards.

---

## Tech Stack

| Layer     | Tech Used                      |
|-----------|--------------------------------|
| Frontend  | React.js, Tailwind CSS         |
| Backend   | Node.js, Express.js, Axios     |
| AI        | Together AI (Llama-3-70B model)|
| Database  | MySQL (locally via XAMPP / remotely via Railway) |
| Deployment| Vercel (Frontend), Railway (Backend) |
| Others    | dotenv, CORS, body-parser      |

---

