# FoodBuddy

FoodBuddy is an ingredient copilot that translates food labels into plain-English explanations, highlights what’s worth paying attention to, and communicates trade-offs and uncertainty instead of pretending there’s a single “good vs bad” answer.

## What it does

- Paste an ingredient list from any packaged food label
- Get a clear explanation for each ingredient in simple language
- See an overall risk signal (low / medium / high) and a numeric score
- Get short “watch-outs” (e.g., high sodium, added sugars, oils, additives)
- Transparency-first: it reminds you when effects depend on portion size, frequency, and personal context

## Tech stack

Frontend:
- React (Create React App)
- Axios
- Custom CSS UI

Backend:
- FastAPI (Python)
- JSON API
- Rule/heuristic ingredient analysis (prototype)

## Project structure

foodbuddy/
  backend/
  frontend/
  README.md
  .gitignore

## Run locally

### 1) Backend (FastAPI)

From the project root:

cd backend

Create and activate a virtual environment:

Windows (PowerShell):
python -m venv .venv
.venv\Scripts\activate

macOS / Linux:
python -m venv .venv
source .venv/bin/activate

Install dependencies and start the server:

pip install -r requirements.txt
uvicorn main:app --reload

Backend URL:
http://127.0.0.1:8000

### 2) Frontend (React)

From the project root:

cd frontend
npm install
npm start

Frontend URL:
http://localhost:3000

## API

POST /analyze

Request body:
{
  "ingredients": "wheat flour, palm oil, salt, monosodium glutamate"
}

Response (example):
{
  "analysis": "• Wheat flour: ...\n• Palm oil: ...\n• Salt: ...",
  "risk_level": "medium",
  "risk_score": 0.63,
  "risk_factors": ["High sodium", "Added fats"]
}

Notes:
- risk_score is expected to be in the range 0..1 (higher means more concern)
- risk_level should align with the score thresholds used by the backend

## Disclaimer

FoodBuddy is an educational prototype. It does not replace professional medical or dietary advice.

## Why this exists

Food labels are hard to interpret quickly and often trigger unnecessary anxiety. FoodBuddy aims to reduce confusion by explaining what ingredients do, what trade-offs they introduce, and where the science or impact depends on dose and personal factors.

## Possible improvements

- Return structured ingredient cards from the backend instead of parsing bullet text
- Add evidence-strength indicators (strong/mixed/limited) per ingredient
- Support product-to-product comparison (two ingredient lists side-by-side)
- Add follow-up question chips (allergies, goals, medical context)
- Optional enrichment via public datasets (e.g., OpenFoodFacts) without turning the project into a database browser

## Author

Freya Sheth
