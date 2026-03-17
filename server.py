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

def get_reply(msg: str) -> str:
    msg = msg.lower().strip()
    now = datetime.now()

    # ── TIME
    if "time" in msg or "now" in msg:
        return f"🕐 The current time is {now.strftime('%I:%M:%S %p')}."

    # ── DATE
    elif any(w in msg for w in ["date", "today", "day"]):
        return f"📅 Today is {now.strftime('%A, %B %d, %Y')}."

    # ── GREETINGS
    elif any(w in msg for w in ["hello", "hi", "hey"]):
        return random.choice([
            "Hello! 👋 Welcome to Infinex’26",
            "Hi there! How can I help you?",
            "Hey! Ask me anything 🤖"
        ])

    # ── BASIC CHAT
    elif "how are you" in msg:
        return "I'm running perfectly ⚡ What about you?"

    elif "your name" in msg:
        return "I'm InfinexChat 🤖"

    elif "help" in msg:
        return "Ask me about time, date, events, jokes, or Infinex’26."

    # ── INFINEX INFO
    elif "college" in msg and "infinex" in msg:
        return "Ganadipathy Tulsi's Jain Engineering College."

    elif "department" in msg:
        return "Department of Computer Science and Cyber Security."

    elif "when" in msg and "infinex" in msg:
        return "On 18th March."

    elif "start time" in msg:
        return "At 9:00 AM."

    elif "where" in msg:
        return "At the Mahaveer Block of the college."

    elif "technical events" in msg:
        return """⚡ STYLESHEET SHOWDOWN
⚡ WHITEPAPER PROTOCOL
⚡ CLOCK SPEED QUIZ
⚡ GRAPHIC GLITCH
⚡ CODE-BLOODED"""

    # ── EVENTS
    elif "stylesheet showdown" in msg:
        return "Web development event."

    elif "whitepaper protocol" in msg:
        return "Paper presentation."

    elif "graphic glitch" in msg:
        return "Poster designing."

    elif "clock speed" in msg:
        return "Quiz competition."

    elif "code blooded" in msg:
        return "Coding and debugging."

    # ── TEAM
    elif "organizing committee" in msg:
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

    # ── EXTRA
    elif "theme" in msg:
        return "Technology, innovation, and engineering excellence."

    elif "aravind mani" in msg:
        return "SAP Delivery Head at ELIXIR Global."

    elif "fun" in msg:
        return "Yes 😄 It will be exciting!"

    elif "food" in msg:
        return "Yes, food will be provided."

    elif "certificate" in msg:
        return "Yes, useful for your resume."

    # ── JOKES
    elif "joke" in msg:
        return random.choice([
            "Why do robots panic? They don't 😄",
            "Too many bytes made the robot fat 🤖",
            "My PC said take a break… now ads everywhere 😂"
        ])

    # ── THANKS / BYE
    elif "thank" in msg:
        return "You're welcome 😊"

    elif "bye" in msg:
        return "Goodbye 👋 See you again!"

    # ── DEFAULT
    else:
        return random.choice([
            "I didn't understand 🤔 Try asking about Infinex’26.",
            "Ask me about events, time, or details!",
            "Try 'technical events' or 'schedule' 😊"
        
    else:
        return "Sorry, I didn't understand. Please ask about Infinex’26."
    # Default fallback
    fallbacks = [
        "Hmm, I'm not sure about that one 🤔 Try asking about the **time**, **date**, a **joke**, or **facts**!",
        "I didn't quite catch that. You can ask me things like *'What time is it?'* or *'Tell me a joke!'* 🤖",
        "That's a tricky one! Try asking about **time**, **date**, or type **'help'** to see what I can do.",
    ]
    return random.choice(fallbacks)
    
