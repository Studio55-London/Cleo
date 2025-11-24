# Cleo Telegram Bot

Mobile access to all 31 AI agents via Telegram messenger.

## Quick Start

### 1. Prerequisites

Ensure Cleo backend is running:
```bash
cd C:\Users\AndrewSmart\Claude_Projects\Cleo
python app.py
```

Verify at: http://localhost:8080

### 2. Create Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Start a chat and type: `/newbot`
3. Follow the prompts to create your bot
4. Save the API token you receive

### 3. Configure Environment

Add to your `.env` file in the Cleo project root:

```env
# Required for Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather

# Optional - Todoist Integration (coming soon)
TODOIST_API_TOKEN=your_todoist_token

# Optional - Custom backend URL (defaults to localhost:8080)
CLEO_API_URL=http://localhost:8080/api
```

### 4. Install Dependencies

```bash
cd C:\Users\AndrewSmart\Claude_Projects\Cleo
pip install python-telegram-bot httpx
```

Or update from requirements.txt:
```bash
pip install -r requirements.txt
```

### 5. Run the Bot

```bash
cd C:\Users\AndrewSmart\Claude_Projects\Cleo\telegram_bot
python bot.py
```

You should see:
```
============================================================
🤖 Cleo Telegram Bot
============================================================
Status: ✅ Running
Backend: Flask (http://localhost:8080)
Agents: 31 specialized agents
Features: Multi-agent routing, Session management

💬 Bot is ready to receive messages!
Press Ctrl+C to stop.
============================================================
```

### 6. Start Chatting

1. Find your bot in Telegram
2. Send `/start` to begin
3. Try commands:
   - `/help` - Show available commands
   - `/agents` - List all 31 agents
   - `/reset` - Clear conversation history

4. Natural conversation:
   ```
   You: Help me set goals for next quarter

   Bot: **Coach:**
   Great! Let's work on your Q1 goals...
   ```

## Features

✅ **31 Specialized Agents** - Master, Personal, Team, Worker, Expert tiers
✅ **Intelligent Routing** - Automatic agent detection from keywords
✅ **Session Memory** - Conversations maintain context via Spaces
✅ **Natural Language** - Just message naturally, no complex syntax
✅ **Multi-agent Support** - Seamless switching between agents

## Available Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message and capabilities |
| `/help` | Show all commands and features |
| `/agents` | List all 31 agents by tier |
| `/task [description]` | Create a task (coming soon) |
| `/reset` | Clear conversation history |

## How Agent Routing Works

The bot automatically detects which agent to use based on keywords:

**Examples:**
- "coach", "goal" → Coach
- "health", "fitness" → HealthFit
- "decidewright", "qra" → DecideWrightMD
- "marketing" → CMO
- "sales" → CSO
- "finance" → FD
- "legal" → Legal

**No keyword?** Defaults to Coach

## Architecture

```
Telegram User
      ↓
Telegram Bot (bot.py)
      ↓
CleoAgentHandler (httpx client)
      ↓
Flask Backend (http://localhost:8080/api)
      ↓
31 Agents + Claude API
```

## Integration with Cleo

The Telegram bot integrates with Cleo's existing architecture:

1. **Spaces System**: Each Telegram user gets a dedicated Space
2. **Messages**: All conversations stored in Space messages
3. **Agents**: Uses Cleo's agent registry
4. **Sessions**: Maintains context across conversations

## Troubleshooting

### Bot doesn't respond

**Check:**
1. Is `bot.py` running?
2. Is Cleo backend running on port 8080?
3. Is TELEGRAM_BOT_TOKEN correct in `.env`?

**Fix:**
```bash
# Restart the bot
Ctrl+C  (to stop)
python bot.py  (to start again)
```

### "Cannot connect to Cleo backend"

**Check:**
1. Is backend running? Test: `curl http://localhost:8080/api/status`
2. Is the API URL correct in config?

**Fix:**
```bash
# Start the backend first
cd C:\Users\AndrewSmart\Claude_Projects\Cleo
python app.py
```

### "Configuration Error"

**Check:**
- `.env` file exists in Cleo project root
- TELEGRAM_BOT_TOKEN is set
- No extra spaces or quotes around token

## Security Notes

⚠️ **Keep these secret:**
- TELEGRAM_BOT_TOKEN
- ANTHROPIC_API_KEY
- TODOIST_API_TOKEN

✅ **Best practices:**
- Don't commit `.env` file to Git
- Don't share your bot token publicly
- Regenerate tokens if compromised

## Project Structure

```
telegram_bot/
├── bot.py              # Main bot application
├── agent_handler.py    # Cleo API integration
├── config.py           # Configuration settings
└── README.md           # This file
```

## Future Enhancements

- [ ] Todoist task creation
- [ ] Inline buttons for agent selection
- [ ] Voice message support
- [ ] File upload capabilities
- [ ] Daily automated check-ins
- [ ] Analytics dashboard

## Support

**Issues?**
1. Check troubleshooting section above
2. Verify backend is running: http://localhost:8080
3. Check logs in terminal

## Version

**Current Version:** 1.0.0
**Backend:** Cleo Flask Backend
**Last Updated:** November 2025
**Status:** ✅ Ready for Use
