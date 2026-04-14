# backend/database.py
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from config import MONGO_URI, DB_NAME
import bcrypt
from datetime import datetime
import os
print("DEBUG URI:", os.getenv("MONGO_URI"))

class DatabaseManager:
    def __init__(self):
        if not MONGO_URI:
            raise ValueError("❌ MONGO_URI is not set in environment variables")

        try:
            self.client = MongoClient(MONGO_URI)
            self.client.admin.command('ping')
            print("✅ Connected to MongoDB successfully!")
        except ConnectionFailure:
            print("❌ MongoDB connection failed.")
            raise
        
        self.db = self.client[DB_NAME]
        self.setup_database()
    
    def setup_database(self):
        """Auto-create collections and indexes if they don't exist"""
        
        # List of required collections
        required_collections = ['users', 'properties', 'bookings']
        
        # Get existing collections
        existing_collections = self.db.list_collection_names()
        
        # Create missing collections
        for collection in required_collections:
            if collection not in existing_collections:
                self.db.create_collection(collection)
                print(f"📁 Created collection: {collection}")
        
        # Create indexes
        self.create_indexes()
        
        # Create admin user if not exists
        self.create_admin_if_not_exists()
        
        print(f"📊 Database '{DB_NAME}' is ready with {len(required_collections)} collections")
    
    def create_indexes(self):
        """Create necessary indexes for better performance"""
        
        # Users collection indexes
        self.db.users.create_index([("email", 1)], unique=True)
        print("✅ Created index: users.email")
        
        # Properties collection indexes
        self.db.properties.create_index([("location", "text"), ("title", "text")])
        self.db.properties.create_index([("price", 1)])
        self.db.properties.create_index([("type", 1)])
        self.db.properties.create_index([("available", 1)])
        print("✅ Created indexes: properties")
        
        # Bookings collection indexes
        self.db.bookings.create_index([("propertyId", 1)])
        self.db.bookings.create_index([("tenantId", 1)])
        self.db.bookings.create_index([("status", 1)])
        print("✅ Created indexes: bookings")
    
    def create_admin_if_not_exists(self):
        """Create default admin user if no admin exists"""
        
        # Check if any admin exists
        admin_exists = self.db.users.find_one({"role": "admin"})
        
        if not admin_exists:
            # Hash password for 'admin123'
            password = "admin123"
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
            
            # Create admin user
            admin_user = {
                "name": "Super Admin",
                "email": "admin@rentalbooking.com",
                "password": hashed_password,
                "role": "admin",
                "contact": {
                    "phone": "9999999999",
                    "address": "Admin Office",
                    "alternate_phone": ""
                },
                "createdAt": datetime.utcnow()
            }
            
            self.db.users.insert_one(admin_user)
            print("👑 Created default admin user:")
            print("   Email: admin@rentalbooking.com")
            print("   Password: admin123")
        else:
            print("👑 Admin user already exists")

# Create a single instance to be used across the app
db_manager = DatabaseManager()
db = db_manager.db