# backend/middleware/auth_middleware.py
from functools import wraps
from flask import request, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
from database import db
from bson import ObjectId

def token_required(f):
    """Decorator to verify JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            
            # Get user from database
            user = db.users.find_one({'_id': ObjectId(user_id)})
            if not user:
                return jsonify({'success': False, 'error': 'User not found'}), 401
            
            # Attach user info to request
            request.user = {
                'id': str(user['_id']),
                'email': user['email'],
                'role': user['role'],
                'name': user['name']
            }
            
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({'success': False, 'error': 'Invalid or expired token'}), 401
    return decorated

def admin_required(f):
    """Decorator to require admin role"""
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            
            # Get user from database
            user = db.users.find_one({'_id': ObjectId(user_id)})
            if not user:
                return jsonify({'success': False, 'error': 'User not found'}), 401
            
            # Check admin role
            if user.get('role') != 'admin':
                return jsonify({'success': False, 'error': 'Admin access required'}), 403
            
            # Attach user info to request
            request.user = {
                'id': str(user['_id']),
                'email': user['email'],
                'role': user['role'],
                'name': user['name']
            }
            
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({'success': False, 'error': 'Invalid or expired token'}), 401
    return decorated