from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import random

app = FastAPI()

# ── CORS — allow the browser to call from any origin (file://, localhost, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class Message(BaseModel):
    message: str

# ── /api/status  (used by the chat UI to show "API online / offline")
@app.get("/api/status")
def status():
    return {"status": "ok", "server": "InfinexChat", "time": datetime.now().isoformat()}

# ── /api/chat
@app.post("/api/chat")
def chat(data: Message):
    msg = data.message.lower().strip()
    reply = get_reply(msg)
    return {"reply": reply}

# ── Smart reply logic
def get_reply(msg: str) -> str:
    msg = msg.lower().strip()
    now = datetime.now()

    # ── TIME
    if "time" in msg or "now" in msg:
        return f"🕐 Current time: {now.strftime('%I:%M:%S %p')}"

    # ── DATE / DAY
    elif any(w in msg for w in ["date", "today"]):
        return f"📅 Today is {now.strftime('%A, %B %d, %Y')}"

    elif "day" in msg:
        return f"Today is {now.strftime('%A')}"

    # ── GREETING
    elif any(w in msg for w in ["hello", "hi", "hey", "hii"]):
        return random.choice([
            "Hello! 👋 Welcome to Infinex’26",
            "Hi there! How can I help you?",
            "Hey! Ask me anything 🤖"
        ])

    # ── BASIC CHAT
    elif "how are you" in msg:
        return "I'm running perfectly ⚡ How about you?"

    elif "your name" in msg or "who are you" in msg:
        return "I'm InfinexChat 🤖 — your assistant."

    elif "help" in msg:
        return "Ask me about time, date, events, jokes, or Infinex’26."

    # ── INFINEX INFO
    elif "infinex" in msg and "college" in msg:
        return "Ganadipathy Tulsi's Jain Engineering College."

    elif "department" in msg:
        return "Department of Computer Science and Cyber Security."

    elif "when" in msg and "infinex" in msg:
        return "📅 Infinex’26 is on 18th March."

    elif "start" in msg or "timing" in msg:
        return "⏰ Event starts at 9:00 AM."

    elif "where" in msg or "location" in msg:
        return "📍 Mahaveer Block, College Campus."

    elif "tell about infinex" in msg or "about infinex" in msg:
        return "Infinex’26 is a technical symposium conducted by CSE & Cyber Security."

    # ── EVENTS
    elif "technical events" in msg or "events" in msg:
        return """⚡ STYLESHEET SHOWDOWN
⚡ WHITEPAPER PROTOCOL
⚡ CLOCK SPEED QUIZ
⚡ GRAPHIC GLITCH
⚡ CODE-BLOODED"""

    elif "stylesheet" in msg:
        return "💻 Web Development Competition."

    elif "whitepaper" in msg:
        return "📄 Paper Presentation Event."

    elif "graphic" in msg:
        return "🎨 Poster Designing Event."

    elif "clock speed" in msg:
        return "🧠 Quiz Competition."

    elif "code blooded" in msg or "coding" in msg:
        return "👨‍💻 Coding & Debugging Competition."

    # ── TEAM
    elif "organizing" in msg:
        return """Principal: D. M Barathi
Vice Principal: Prof. D Durai Kumar
HOD: Mrs. SI Santhanalakshmi"""

    elif "student coordinator" in msg:
        return """Usharani S
Aravind Krishna PM
Santhosh Kumar J
Sarathy K
Mohan Raj S
Nehanth R
David Niglin S I"""

    elif "staff coordinator" in msg:
        return """Mrs. S Vennila
Mr. P Jayasooriya
Mr. S Thirumal
Mrs. M Jothika
Mrs. GV Varshini"""

    elif "convener" in msg:
        return "Mrs. SI Santhanalakshmi."

    # ── EXTRA INFO
    elif "theme" in msg:
        return "🚀 Technology, Innovation & Engineering Excellence."

    elif "aravind mani" in msg:
        return "SAP Delivery Head at ELIXIR Global."

    elif "food" in msg:
        return "🍽️ Yes, food will be provided."

    elif "certificate" in msg:
        return "📜 Yes, certificates will be provided."

    elif "fun" in msg:
        return "😄 Yes! It will be fun and exciting!"

    # ── JOKES
    elif any(w in msg for w in ["joke", "funny"]):
        return random.choice([
            "Why do robots never panic? ⚡",
            "Too many bytes made the robot fat 😂",
            "My PC said take a break… now ads everywhere 😆"
        ])

    # ── FACTS
    elif "fact" in msg:
        return random.choice([
            "🤖 First AI chatbot was made in 1966.",
            "💡 Smartphones are more powerful than old NASA computers.",
            "🌐 Over 5 billion people use the internet!"
        ])

    # ── STATUS
    elif "server" in msg or "status" in msg:
        return f"✅ Server is online ({now.strftime('%H:%M:%S')})"

    # ── THANKS / BYE
    elif "thank" in msg:
        return "You're welcome 😊"

    elif "bye" in msg:
        return "Goodbye 👋 See you again!"

    # ── SPECIAL
    elif "hari" in msg:
        return "Welcome Hari 👋"

    # ── DEFAULT FALLBACK
    else:
        return random.choice([
            "🤔 I didn't understand. Ask about Infinex’26!",
            "Try asking about events, timing, or location.",
            "Type 'help' to see what I can do 😊"
        ])
