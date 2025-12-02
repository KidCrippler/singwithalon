#!/bin/bash
#
# Add an admin user to the database
#
# Usage:
#   ./scripts/add-admin.sh <username> <password>
#
# Examples:
#   ./scripts/add-admin.sh moti moti
#   ./scripts/add-admin.sh iris iris
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_PATH="$SCRIPT_DIR/../database/singalong.db"

# Check arguments
if [ $# -ne 2 ]; then
    echo "Usage: $0 <username> <password>"
    exit 1
fi

USERNAME="$1"
PASSWORD="$2"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "❌ Database not found at: $DB_PATH"
    echo "Make sure the backend server has been started at least once."
    exit 1
fi

# Check if user already exists
EXISTING=$(sqlite3 "$DB_PATH" "SELECT username FROM admins WHERE username = '$USERNAME';")
if [ -n "$EXISTING" ]; then
    echo "❌ User \"$USERNAME\" already exists!"
    exit 1
fi

# Hash password using Node.js (bcrypt is not available in bash)
PASSWORD_HASH=$(node -e "
const bcrypt = require('bcrypt');
bcrypt.hash('$PASSWORD', 10).then(hash => console.log(hash));
")

# Insert into database
sqlite3 "$DB_PATH" "INSERT INTO admins (username, password_hash) VALUES ('$USERNAME', '$PASSWORD_HASH');"

echo "✅ Created admin user: $USERNAME"

