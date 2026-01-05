# FoodBuddy

FoodBuddy is your quick, honest companion to decode food labels.

It helps translate confusing ingredient lists into simple, easy-to-understand explanations so you can make sense of what you’re eating, without judgment or fear-based labels.

---

## Live Demo

Frontend (Vercel):  
https://foodbuddy-bay.vercel.app/

Backend API (Render):  
https://foodbuddy-backend-x9qp.onrender.com

---

## Repository

GitHub Repo:  
https://github.com/freyasheth/foodbuddy

This is a single repository containing both frontend and backend.

foodbuddy/
├── frontend/   # React frontend (Vercel)
├── backend/    # FastAPI backend (Render)
└── README.md

---

## What FoodBuddy Does

- Accepts ingredient lists in any messy format (commas, new lines, copied labels)
- Identifies common attention-worthy ingredients like sugars, oils, salt, and additives
- Explains each ingredient in plain English
- Gives an overall summary to help users quickly understand the label

FoodBuddy does not classify food as good or bad.  
It focuses on clarity and understanding.

---

## How It Works

1. User pastes an ingredient list into the web app
2. Frontend sends the data to the backend /analyze endpoint
3. Backend processes the ingredients and returns:
   - a readable breakdown
   - an overall score and tags
4. Frontend displays results as clean, easy-to-scan cards

---

## Tech Stack

Frontend:
- React
- Axios
- Deployed on Vercel

Backend:
- FastAPI
- Uvicorn
- Deployed on Render

Frontend and backend are deployed independently and communicate via API.

---

## Run Locally

### Backend (FastAPI)

From the repo root:

cd backend  
python -m venv .venv  

Activate virtual environment:

Windows:  
.\.venv\Scripts\Activate.ps1  

Mac/Linux:  
source .venv/bin/activate  

Install dependencies:

pip install -r requirements.txt  

Run server:

uvicorn main:app --reload --host 127.0.0.1 --port 8000  

Backend will be available at:  
http://127.0.0.1:8000  

---

### Frontend (React)

From the repo root:

cd frontend  
npm install  

Create a .env file inside frontend/:

REACT_APP_API_URL=http://127.0.0.1:8000  

Start frontend:

npm start  

Frontend will run at:  
http://localhost:3000  

---

## API Reference

### POST /analyze

Request body:

{
  "ingredients": "wheat flour, palm oil, salt, monosodium glutamate"
}

Response body:

{
  "analysis": "Plain-English explanation",
  "risk_score": 0.42,
  "risk_level": "medium",
  "risk_factors": ["Added sugars", "High sodium / salt"]
}

---

## Deployment

Frontend:
- Hosted on Vercel
- Root directory set to frontend
- Uses environment variable:
  REACT_APP_API_URL=https://foodbuddy-backend-x9qp.onrender.com

Backend:
- Hosted on Render
- Root directory set to backend
- Start command:
  uvicorn main:app --host 0.0.0.0 --port $PORT

---

## Disclaimer

FoodBuddy is an educational prototype.  
It is not medical advice and should not replace professional guidance.

---

Built to make food labels easier to understand.
