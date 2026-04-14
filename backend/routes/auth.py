# backend/routes/auth.py
from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import bcrypt
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from database import db
from bson import ObjectId

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.json
        
        # Check if user exists
        if db.users.find_one({'email': data['email']}):
            return jsonify({'success': False, 'error': 'Email already registered'}), 400
        
        # Hash password
        hashed = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
        
        # Create user
        user = {
            'name': data['name'],
            'email': data['email'],
            'password': hashed,
            'role': data.get('role', 'tenant'),
            'phone': data.get('phone', ''),
            'alternate_phone': data.get('alternate_phone', ''),
            'address': data.get('address', ''),
            'createdAt': datetime.utcnow()
        }
        
        result = db.users.insert_one(user)
        
        # Create token using flask_jwt_extended
        access_token = create_access_token(
            identity=str(result.inserted_id),
            additional_claims={'email': user['email'], 'role': user['role']}
        )
        
        return jsonify({
            'success': True,
            'message': 'Registration successful!',
            'token': access_token,
            'user': {
                'id': str(result.inserted_id),
                'name': user['name'],
                'email': user['email'],
                'role': user['role']
            }
        }), 201
        
    except Exception as e:
        print(f"Register error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data['email']
        password = data['password']
        
        # Find user
        user = db.users.find_one({'email': email})
        if not user:
            return jsonify({'success': False, 'error': 'Invalid credentials'}), 401
        
        # Check password
        stored_password = user['password']
        if isinstance(stored_password, str):
            stored_password = stored_password.encode('utf-8')
        
        if not bcrypt.checkpw(password.encode('utf-8'), stored_password):
            return jsonify({'success': False, 'error': 'Invalid credentials'}), 401
        
        # Create token using flask_jwt_extended
        access_token = create_access_token(
            identity=str(user['_id']),
            additional_claims={'email': user['email'], 'role': user['role']}
        )
        
        return jsonify({
            'success': True,
            'message': 'Login successful!',
            'token': access_token,
            'user': {
                'id': str(user['_id']),
                'name': user['name'],
                'email': user['email'],
                'role': user['role']
            }
        }), 200
        
    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@auth_bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    """Get all users (Admin only)"""
    try:
        current_user_id = get_jwt_identity()
        user = db.users.find_one({'_id': ObjectId(current_user_id)})
        
        if not user or user.get('role') != 'admin':
            return jsonify({'success': False, 'error': 'Admin access required'}), 403
        
        # Get ALL users (both admin and tenant)
        users = list(db.users.find({}, {'password': 0}))
        for u in users:
            u['_id'] = str(u['_id'])
        
        # Count only tenant users for the stats
        tenant_count = db.users.count_documents({'role': 'tenant'})
        
        return jsonify({
            'success': True,
            'count': tenant_count,  # Return tenant count for stats
            'total_users': len(users),  # Total users including admins
            'users': users
        }), 200
        
    except Exception as e:
        print(f"Get users error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500