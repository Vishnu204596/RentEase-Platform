# backend/test_auto_setup.py
from database import db_manager, db

print("\n" + "="*50)
print("Testing Auto Database Setup")
print("="*50)

# Check collections
collections = db.list_collection_names()
print(f"\n📁 Collections in '{db.name}':")
for coll in collections:
    count = db[coll].count_documents({})
    print(f"  - {coll}: {count} documents")

# Check admin user
admin = db.users.find_one({"role": "admin"})
if admin:
    print(f"\n👑 Admin user found:")
    print(f"   Name: {admin['name']}")
    print(f"   Email: {admin['email']}")
    print(f"   Role: {admin['role']}")
else:
    print("\n❌ No admin user found")

# Check indexes
print("\n📊 Indexes on 'users' collection:")
for index in db.users.list_indexes():
    print(f"  - {index['name']}")

print("\n✅ Database auto-setup completed successfully!")