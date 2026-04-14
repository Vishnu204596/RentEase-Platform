# backend/server.py
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from database import db
import os
from datetime import timedelta

# Initialize Flask app
app = Flask(__name__, static_folder='../frontend', static_url_path='')

# JWT Configuration
app.config['JWT_SECRET_KEY'] = 'your-super-secret-key-change-this-in-production-2024'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)
app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['JWT_HEADER_NAME'] = 'Authorization'
app.config['JWT_HEADER_TYPE'] = 'Bearer'

CORS(app, supports_credentials=True, origins=["http://localhost:5000", "http://127.0.0.1:5000"])

# Initialize JWT
jwt = JWTManager(app)

# Serve frontend files
@app.route('/')
def serve_index():
    return send_from_directory('../frontend', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('../frontend', filename)

@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory('uploads', filename)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "OK", "message": "Server is running!"})

# Import routes
from routes.auth import auth_bp
from routes.properties import properties_bp
from routes.bookings import bookings_bp
from routes.admin import admin_bp

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(properties_bp, url_prefix='/api/properties')
app.register_blueprint(bookings_bp, url_prefix='/api/bookings')
app.register_blueprint(admin_bp, url_prefix='/api/admin')

if __name__ == '__main__':
    print("\n" + "="*50)
    print("🚀 Rental Booking Platform Backend")
    print("="*50)
    print(f"📍 Frontend: http://localhost:5000")
    print(f"📍 API: http://localhost:5000/api")
    if db is not None:
        print(f"📊 Database: {db.name}")
    else:
        print("❌ Database not connected!")
    print("="*50 + "\n")
    app.run(debug=True, host='0.0.0.0', port=5000)