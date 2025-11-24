"""
Cleo Telegram Bot
Mobile access to all 31 AI agents via Telegram messenger
"""
import logging
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    filters,
    ContextTypes
)
import config
from agent_handler import CleoAgentHandler

# Set up logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO if not config.DEBUG_MODE else logging.DEBUG
)
logger = logging.getLogger(__name__)

# Initialize agent handler
agent_handler = CleoAgentHandler()


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command"""
    response = await agent_handler.handle_command('/start', [], update.effective_user.id)
    await update.message.reply_text(response, parse_mode='Markdown')


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /help command"""
    response = await agent_handler.handle_command('/help', [], update.effective_user.id)
    await update.message.reply_text(response, parse_mode='Markdown')


async def agents_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /agents command"""
    response = await agent_handler.handle_command('/agents', [], update.effective_user.id)
    await update.message.reply_text(response, parse_mode='Markdown')


async def reset_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /reset command"""
    user_id = update.effective_user.id
    response = await agent_handler.handle_command('/reset', [], user_id)
    await update.message.reply_text(response)


async def task_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /task command"""
    args = context.args
    response = await agent_handler.handle_command('/task', args, update.effective_user.id)
    await update.message.reply_text(response, parse_mode='Markdown')


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle regular text messages"""
    user_id = update.effective_user.id
    message_text = update.message.text

    logger.info(f"User {user_id}: {message_text}")

    # Show typing indicator
    await update.message.chat.send_action("typing")

    try:
        # Process message through Cleo API
        response = await agent_handler.send_message_to_agent(
            user_id=user_id,
            message=message_text
        )

        # Send response
        await update.message.reply_text(response, parse_mode='Markdown')

        logger.info(f"Bot response sent to {user_id}")

    except Exception as e:
        logger.error(f"Error handling message: {e}", exc_info=True)
        await update.message.reply_text(
            "⚠️ I encountered an error. Please ensure Cleo is running on http://localhost:8080 and try again.\n\nUse /help for assistance."
        )


async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle errors"""
    logger.error(f"Update {update} caused error {context.error}", exc_info=context.error)

    if update and update.effective_message:
        await update.effective_message.reply_text(
            "⚠️ An error occurred. Please try again or use /help for assistance."
        )


async def post_shutdown(application: Application):
    """Cleanup on shutdown"""
    logger.info("Shutting down bot...")
    agent_handler.close()


def main():
    """Run the bot"""
    try:
        # Validate configuration
        config.validate_config()

        # Print startup banner
        print("\n" + "="*60)
        print("🤖 Cleo Telegram Bot")
        print("="*60)
        print("Status: ✅ Running")
        print(f"Backend: Flask (http://localhost:8080)")
        print("Agents: 31 specialized agents")
        print("Features: Multi-agent routing, Session management")
        print("\n💬 Bot is ready to receive messages!")
        print("Press Ctrl+C to stop.")
        print("="*60 + "\n")

        # Create application
        application = Application.builder().token(config.TELEGRAM_BOT_TOKEN).build()

        # Add command handlers
        application.add_handler(CommandHandler("start", start_command))
        application.add_handler(CommandHandler("help", help_command))
        application.add_handler(CommandHandler("agents", agents_command))
        application.add_handler(CommandHandler("reset", reset_command))
        application.add_handler(CommandHandler("task", task_command))

        # Add message handler for regular text
        application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

        # Add error handler
        application.add_error_handler(error_handler)

        # Add shutdown handler
        application.post_shutdown = post_shutdown

        # Start the bot
        application.run_polling(allowed_updates=Update.ALL_TYPES)

    except ValueError as e:
        print(f"\n❌ Configuration Error: {e}")
        print("\nPlease ensure TELEGRAM_BOT_TOKEN is set in your .env file.")
        print("See README.md for setup instructions.\n")
    except KeyboardInterrupt:
        print("\n\n👋 Bot stopped by user\n")
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        print(f"\n❌ Fatal error: {e}\n")


if __name__ == "__main__":
    main()
