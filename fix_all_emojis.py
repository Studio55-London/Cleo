"""Fix all emoji encoding issues in Python files"""
import sys
from pathlib import Path

files_to_fix = [
    'config/settings.py',
    'models.py',
    'agents/__init__.py'
]

replacements = {
    '⚠️': 'WARNING:',
    '✅': '[SUCCESS]',
    '❌': '[NO]',
    'ℹ️': '[INFO]',
    '🚀': '',
    '📊': '',
    '🔧': '',
    '💡': '',
}

for file_path in files_to_fix:
    try:
        # Read file with UTF-8 encoding
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Replace all emojis
        for emoji, replacement in replacements.items():
            content = content.replace(emoji, replacement)

        # Write back with UTF-8 encoding
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

        print(f"Fixed: {file_path}")
    except FileNotFoundError:
        print(f"Skipped (not found): {file_path}")

print("\nAll emoji encoding issues fixed!")
