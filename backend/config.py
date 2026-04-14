import os
from dotenv import load_dotenv
from datetime import timedelta

load_dotenv()

# MongoDB
MONGO_URI = os.getenv("MONGO_URI", "mongodb://host.docker.internal:27017/")
DB_NAME = os.getenv("DB_NAME", "rental_booking_db")

# JWT
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-super-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# File Upload
UPLOAD_FOLDER = "uploads/properties/"
MAX_CONTENT_LENGTH = 16 * 1024 * 1024
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)