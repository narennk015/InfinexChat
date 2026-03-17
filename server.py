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
    now = datetime.now()

    # Time
    if any(w in msg for w in ["time", "what time", "current time", "clock"]):
        return f"🕐 The current time is **{now.strftime('%I:%M:%S %p')}**."

    # Date
    if any(w in msg for w in ["date", "today", "what day", "day is it"]):
        return f"📅 Today is **{now.strftime('%A, %B %d, %Y')}**."

    # Day of week
    if "day of the week" in msg or "weekday" in msg:
        return f"Today is **{now.strftime('%A')}**."

    # Greetings
    if any(w in msg for w in ["hello", "hi", "hey", "howdy", "greetings"]):
        greets = [
            "Hello there! 👋 How can I help you today?",
            "Hi! Great to see you. What's on your mind?",
            "Hey! I'm InfinexChat — ask me anything! 🤖"
        ]
        return random.choice(greets)

    # How are you
    if any(w in msg for w in ["how are you", "how r u", "you okay", "you good"]):
        return "I'm running perfectly — all systems online! ⚡ How about you?"

    # Name / identity
    if any(w in msg for w in ["your name", "who are you", "what are you", "what is your name"]):
        return "I'm **InfinexChat** 🤖 — your AI-powered assistant, connected to a live server. Ask me about time, date, facts, jokes and more!"

    # What can you do
    if any(w in msg for w in ["what can you do", "help", "capabilities", "features"]):
        return (
            "Here's what I can do:\n"
            "• 🕐 Tell you the **current time**\n"
            "• 📅 Give you today's **date**\n"
            "• 😄 Share **jokes** and fun facts\n"
            "• 🤖 Chat about anything!\n\n"
            "Just type your message and I'll respond live from the server."
        )

    # Server status
    if any(w in msg for w in ["server", "status", "online", "server status", "api"]):
        return f"✅ Server is **online** and healthy.\nCurrent server time: `{now.strftime('%H:%M:%S')}`"

    # Jokes
    if any(w in msg for w in ["joke", "funny", "laugh", "humor"]):
        jokes = [
            "Why do robots never panic? Because they always **keep their circuits calm**! ⚡",
            "Why did the robot go on a diet? Because it had too many **bytes**! 🤖",
            "I told my computer I needed a break. Now it won't stop sending me **Kit-Kat ads**. 😄",
            "Why don't robots eat clocks? Because it's too **time-consuming**! ⏰",
            "What do you call a robot that always tells the truth? **A bot that can't lie**-cense! 🤖",
        ]
        return random.choice(jokes)

    # Robot / interesting facts
    if any(w in msg for w in ["fact", "interesting", "robot fact", "did you know"]):
        facts = [
            "🤖 **Fun fact:** The word 'robot' comes from the Czech word *robota*, meaning forced labor — first used in a 1920 play!",
            "⚡ **Fun fact:** The first programmable computer weighed over **27 tons** and filled an entire room!",
            "🌐 **Fun fact:** There are more than **5 billion** internet users worldwide as of 2024.",
            "💡 **Fun fact:** The first AI chatbot, ELIZA, was created in **1966** at MIT.",
            "🔢 **Fun fact:** A modern smartphone has more computing power than all of NASA's computers in 1969 combined!",
        ]
        return random.choice(facts)

    # Goodbye
    if any(w in msg for w in ["bye", "goodbye", "see you", "ciao", "later", "exit"]):
        return "Goodbye! 👋 Come back anytime — I'm always here!"

    # Thanks
    if any(w in msg for w in ["thank", "thanks", "thx", "ty", "appreciate"]):
        return "You're welcome! 😊 Let me know if there's anything else I can help with."

    # Weather (graceful not-supported)
    if "weather" in msg:
        return "🌤️ I don't have live weather data yet, but you can check **weather.com** for your location!"

    # Default fallback
    fallbacks = [
        "Hmm, I'm not sure about that one 🤔 Try asking about the **time**, **date**, a **joke**, or **facts**!",
        "I didn't quite catch that. You can ask me things like *'What time is it?'* or *'Tell me a joke!'* 🤖",
        "That's a tricky one! Try asking about **time**, **date**, or type **'help'** to see what I can do.",
    ]
    return random.choice(fallbacks)
    if "hari" in msg:
        return "Welcome to harii"
