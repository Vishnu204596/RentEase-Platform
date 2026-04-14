# backend/routes/bookings.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db
from bson import ObjectId
from datetime import datetime

bookings_bp = Blueprint('bookings', __name__)

# Helper function to convert ObjectId to string
def serialize_booking(booking, include_property=True, include_tenant=True):
    booking_dict = {
        '_id': str(booking['_id']),
        'propertyId': str(booking['propertyId']),
        'tenantId': str(booking['tenantId']),
        'startDate': booking.get('startDate'),
        'endDate': booking.get('endDate'),
        'message': booking.get('message'),
        'status': booking.get('status', 'pending'),
        'createdAt': booking.get('createdAt')
    }
    
    # Populate property details if requested
    if include_property:
        property_data = db.properties.find_one({'_id': booking['propertyId']})
        if property_data:
            booking_dict['propertyTitle'] = property_data.get('title', 'N/A')
            booking_dict['propertyLocation'] = property_data.get('location', 'N/A')
            booking_dict['propertyType'] = property_data.get('type', 'N/A')
            booking_dict['propertyPrice'] = property_data.get('price', 0)
            booking_dict['propertyId_obj'] = {
                '_id': str(property_data['_id']),
                'title': property_data.get('title'),
                'location': property_data.get('location')
            }
    
    # Populate tenant details if requested
    if include_tenant:
        tenant_data = db.users.find_one({'_id': booking['tenantId']})
        if tenant_data:
            booking_dict['tenantName'] = tenant_data.get('name', 'N/A')
            booking_dict['tenantEmail'] = tenant_data.get('email', 'N/A')
            booking_dict['tenantPhone'] = tenant_data.get('phone', 'N/A')
            booking_dict['tenantId_obj'] = {
                '_id': str(tenant_data['_id']),
                'name': tenant_data.get('name'),
                'email': tenant_data.get('email')
            }
    
    return booking_dict

# Get bookings for logged-in tenant
@bookings_bp.route('/my', methods=['GET'])
@jwt_required()
def get_my_bookings():
    try:
        user_id = get_jwt_identity()
        print(f"DEBUG: user_id from token = {user_id}")
        
        # Get all bookings for this tenant
        bookings = list(db.bookings.find({'tenantId': ObjectId(user_id)}).sort('createdAt', -1))
        print(f"DEBUG: Found {len(bookings)} bookings")
        
        # Serialize with property details
        serialized_bookings = [serialize_booking(booking, include_tenant=False) for booking in bookings]
        
        return jsonify({
            'success': True,
            'count': len(serialized_bookings),
            'bookings': serialized_bookings
        }), 200
        
    except Exception as e:
        print(f"Error in get_my_bookings: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

# Create new booking
@bookings_bp.route('/', methods=['POST'])
@jwt_required()
def create_booking():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        print(f"DEBUG: Creating booking for user: {user_id}")
        print(f"DEBUG: Request data: {data}")
        
        property_id = data.get('propertyId')
        start_date = data.get('startDate')
        end_date = data.get('endDate')
        message = data.get('message', '')
        
        # Validate property exists
        property_data = db.properties.find_one({'_id': ObjectId(property_id)})
        if not property_data:
            return jsonify({'success': False, 'error': 'Property not found'}), 404
        
        # CHECK FOR EXISTING PENDING BOOKING FOR SAME PROPERTY
        existing_booking = db.bookings.find_one({
            'tenantId': ObjectId(user_id),
            'propertyId': ObjectId(property_id),
            'status': 'pending'
        })
        
        if existing_booking:
            return jsonify({
                'success': False, 
                'error': 'You already have a pending request for this property. Please wait for admin response.'
            }), 400
        
        # Create new booking
        booking = {
            'propertyId': ObjectId(property_id),
            'tenantId': ObjectId(user_id),
            'startDate': start_date,
            'endDate': end_date,
            'message': message,
            'status': 'pending',
            'createdAt': datetime.utcnow()
        }
        
        result = db.bookings.insert_one(booking)
        print(f"DEBUG: Booking created with ID: {result.inserted_id}")
        
        return jsonify({
            'success': True,
            'message': 'Visit request sent successfully! We will contact you soon.',
            'bookingId': str(result.inserted_id)
        }), 201
        
    except Exception as e:
        print(f"Error in create_booking: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

# Get all bookings (for admin)
@bookings_bp.route('/', methods=['GET'])
@jwt_required()
def get_all_bookings():
    try:
        user_id = get_jwt_identity()
        
        # Check if user is admin
        user = db.users.find_one({'_id': ObjectId(user_id)})
        if not user or user.get('role') != 'admin':
            return jsonify({'success': False, 'error': 'Admin access required'}), 403
        
        # Get all bookings with property and tenant details
        bookings = list(db.bookings.find().sort('createdAt', -1))
        
        # Serialize with both property and tenant details
        serialized_bookings = [serialize_booking(booking, include_property=True, include_tenant=True) for booking in bookings]
        
        return jsonify({
            'success': True,
            'count': len(serialized_bookings),
            'bookings': serialized_bookings
        }), 200
        
    except Exception as e:
        print(f"Error in get_all_bookings: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# Update booking status (for admin)
@bookings_bp.route('/<booking_id>/status', methods=['PUT'])
@jwt_required()
def update_booking_status(booking_id):
    try:
        user_id = get_jwt_identity()
        
        # Check if user is admin
        user = db.users.find_one({'_id': ObjectId(user_id)})
        if not user or user.get('role') != 'admin':
            return jsonify({'success': False, 'error': 'Admin access required'}), 403
        
        data = request.get_json()
        new_status = data.get('status')
        
        if new_status not in ['pending', 'accepted', 'rejected']:
            return jsonify({'success': False, 'error': 'Invalid status'}), 400
        
        result = db.bookings.update_one(
            {'_id': ObjectId(booking_id)},
            {'$set': {'status': new_status, 'updatedAt': datetime.utcnow()}}
        )
        
        if result.modified_count == 0:
            return jsonify({'success': False, 'error': 'Booking not found'}), 404
        
        return jsonify({
            'success': True,
            'message': f'Booking {new_status} successfully'
        }), 200
        
    except Exception as e:
        print(f"Error in update_booking_status: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500