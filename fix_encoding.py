"""Fix emoji encoding issues in settings.py"""
import sys

# Read file with UTF-8 encoding
with open('config/settings.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace emojis with ASCII text
content = content.replace('⚠️', 'WARNING:')
content = content.replace('✅', '[YES]')
content = content.replace('❌', '[NO]')

# Write back with UTF-8 encoding
with open('config/settings.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed emoji encoding in settings.py")
