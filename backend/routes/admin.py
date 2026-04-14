# backend/routes/admin.py
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db
from bson import ObjectId

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_admin_stats():
    try:
        user_id = get_jwt_identity()
        user = db.users.find_one({'_id': ObjectId(user_id)})
        
        if not user or user.get('role') != 'admin':
            return jsonify({'success': False, 'error': 'Admin access required'}), 403
        
        total_properties = db.properties.count_documents({})
        total_bookings = db.bookings.count_documents({})
        pending_bookings = db.bookings.count_documents({'status': 'pending'})
        total_users = db.users.count_documents({'role': 'tenant'})  # Count only tenants
        
        return jsonify({
            'success': True,
            'stats': {
                'totalProperties': total_properties,
                'totalBookings': total_bookings,
                'pendingBookings': pending_bookings,
                'totalUsers': total_users
            }
        }), 200
        
    except Exception as e:
        print(f"Error in admin stats: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500