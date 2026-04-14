# backend/routes/properties.py
from flask import Blueprint, request, jsonify
from datetime import datetime
import os
import uuid
from werkzeug.utils import secure_filename
from bson import ObjectId
from database import db
from middleware.auth_middleware import token_required, admin_required
from config import UPLOAD_FOLDER, ALLOWED_EXTENSIONS

properties_bp = Blueprint('properties', __name__)

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_image(file, prefix=""):
    """Save image and return the path"""
    if not file or file.filename == '':
        return None
    
    if not allowed_file(file.filename):
        raise ValueError("File type not allowed. Use: png, jpg, jpeg, gif, webp")
    
    # Generate unique filename
    ext = file.filename.rsplit('.', 1)[1].lower()
    unique_name = f"{prefix}{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(UPLOAD_FOLDER, unique_name)
    
    # Save file
    file.save(filepath)
    print(f"File saved to: {filepath}")
    
    # Return URL path (for browser access)
    return f"/uploads/properties/{unique_name}"

def delete_image_file(filepath):
    """Delete image file from filesystem"""
    if filepath and os.path.exists(filepath.lstrip('/')):
        os.remove(filepath.lstrip('/'))

@properties_bp.route('/', methods=['GET'])
def get_all_properties():
    """Get all available properties (public access)"""
    try:
        # Get query parameters for filtering
        property_type = request.args.get('type')
        min_price = request.args.get('min_price')
        max_price = request.args.get('max_price')
        location = request.args.get('location')
        
        # Build query
        query = {'available': True}
        
        if property_type:
            query['type'] = property_type
        
        if min_price or max_price:
            price_query = {}
            if min_price:
                price_query['$gte'] = float(min_price)
            if max_price:
                price_query['$lte'] = float(max_price)
            query['price'] = price_query
        
        if location:
            query['location'] = {'$regex': location, '$options': 'i'}
        
        # Get properties
        properties = list(db.properties.find(query).sort('createdAt', -1))
        
        # Convert ObjectId to string
        for prop in properties:
            prop['_id'] = str(prop['_id'])
        
        return jsonify({
            'success': True,
            'count': len(properties),
            'properties': properties
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@properties_bp.route('/<property_id>', methods=['GET'])
def get_property(property_id):
    """Get single property details"""
    try:
        property_data = db.properties.find_one({'_id': ObjectId(property_id)})
        
        if not property_data:
            return jsonify({'success': False, 'error': 'Property not found'}), 404
        
        property_data['_id'] = str(property_data['_id'])
        
        return jsonify({
            'success': True,
            'property': property_data
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@properties_bp.route('/', methods=['POST'])
@admin_required
def add_property():
    """Add new property (Admin only)"""
    try:
        print("=== ADD PROPERTY REQUEST ===")
        print("Form data:", request.form)
        print("Files:", request.files)
        
        # Get form data
        title = request.form.get('title')
        property_type = request.form.get('type')
        location = request.form.get('location')
        price = request.form.get('price')
        bedrooms = request.form.get('bedrooms', 1)
        bathrooms = request.form.get('bathrooms', 1)
        amenities = request.form.getlist('amenities')
        
        # Validate required fields
        if not all([title, property_type, location, price]):
            return jsonify({
                'success': False, 
                'error': 'Missing required fields: title, type, location, price'
            }), 400
        
        # Convert price to float
        try:
            price = float(price)
        except:
            return jsonify({'success': False, 'error': 'Invalid price format'}), 400
        
        # Handle images
        main_image = request.files.get('main_image')
        gallery_files = request.files.getlist('gallery_images')
        
        # Save main image
        main_path = None
        if main_image and main_image.filename:
            main_path = save_image(main_image, "main_")
        else:
            # Use placeholder if no image
            main_path = "https://via.placeholder.com/400x250?text=No+Image"
        
        # Save gallery images
        gallery_paths = []
        for img in gallery_files:
            if img and img.filename:
                path = save_image(img, "gallery_")
                if path:
                    gallery_paths.append(path)
        
        # Create property document
        property_data = {
            "title": title,
            "type": property_type,
            "location": location,
            "price": price,
            "bedrooms": int(bedrooms),
            "bathrooms": int(bathrooms),
            "amenities": amenities if amenities else [],
            "images": {
                "main": main_path,
                "gallery": gallery_paths
            },
            "available": True,
            "owner": request.user.get('name', 'Admin'),
            "createdAt": datetime.utcnow()
        }
        
        # Insert into MongoDB
        result = db.properties.insert_one(property_data)
        
        print(f"Property added successfully with ID: {result.inserted_id}")
        
        return jsonify({
            "success": True,
            "message": "Property added successfully!",
            "property_id": str(result.inserted_id)
        }), 201
        
    except Exception as e:
        print(f"Error adding property: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500
    

@properties_bp.route('/<property_id>', methods=['PUT'])
@admin_required
def edit_property(property_id):
    """Edit property (Admin only)"""
    try:
        # Get existing property
        existing = db.properties.find_one({'_id': ObjectId(property_id)})
        if not existing:
            return jsonify({'success': False, 'error': 'Property not found'}), 404
        
        # Update text fields
        update_data = {}
        updatable_fields = ['title', 'type', 'location', 'price', 'bedrooms', 'bathrooms', 'amenities', 'available']
        
        for field in updatable_fields:
            if field in request.form:
                if field in ['price', 'bedrooms', 'bathrooms']:
                    update_data[field] = float(request.form[field]) if field == 'price' else int(request.form[field])
                elif field == 'amenities':
                    update_data[field] = request.form.getlist(field)
                else:
                    update_data[field] = request.form[field]
        
        # Handle main image update
        if 'main_image' in request.files and request.files['main_image'].filename:
            # Delete old image
            old_main = existing['images'].get('main')
            if old_main:
                delete_image_file(old_main)
            
            # Save new one
            new_main = save_image(request.files['main_image'], "main_")
            update_data['images.main'] = new_main
        
        # Handle new gallery images
        if 'gallery_images' in request.files:
            new_gallery = request.files.getlist('gallery_images')
            existing_gallery = existing['images'].get('gallery', [])
            
            for img in new_gallery:
                if img and img.filename:
                    path = save_image(img, "gallery_")
                    if path:
                        existing_gallery.append(path)
            
            update_data['images.gallery'] = existing_gallery
        
        # Delete specific gallery images
        if 'delete_gallery_images' in request.form:
            to_delete = request.form.getlist('delete_gallery_images')
            existing_gallery = existing['images'].get('gallery', [])
            
            for img_path in to_delete:
                if img_path in existing_gallery:
                    existing_gallery.remove(img_path)
                    delete_image_file(img_path)
            
            update_data['images.gallery'] = existing_gallery
        
        # Update in database
        if update_data:
            db.properties.update_one(
                {'_id': ObjectId(property_id)},
                {'$set': update_data}
            )
        
        return jsonify({"success": True, "message": "Property updated successfully!"}), 200
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@properties_bp.route('/<property_id>', methods=['DELETE'])
@admin_required
def delete_property(property_id):
    """Delete property and its images (Admin only)"""
    try:
        # Get property to delete images
        property_data = db.properties.find_one({'_id': ObjectId(property_id)})
        if not property_data:
            return jsonify({'success': False, 'error': 'Property not found'}), 404
        
        # Delete main image file
        main_img = property_data['images'].get('main')
        if main_img:
            delete_image_file(main_img)
        
        # Delete gallery images
        for img_path in property_data['images'].get('gallery', []):
            delete_image_file(img_path)
        
        # Delete from database
        db.properties.delete_one({'_id': ObjectId(property_id)})
        
        return jsonify({"success": True, "message": "Property deleted successfully!"}), 200
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@properties_bp.route('/toggle-availability/<property_id>', methods=['PATCH'])
@admin_required
def toggle_availability(property_id):
    """Toggle property availability (Admin only)"""
    try:
        property_data = db.properties.find_one({'_id': ObjectId(property_id)})
        if not property_data:
            return jsonify({'success': False, 'error': 'Property not found'}), 404
        
        new_status = not property_data.get('available', True)
        db.properties.update_one(
            {'_id': ObjectId(property_id)},
            {'$set': {'available': new_status}}
        )
        
        return jsonify({
            "success": True,
            "message": f"Property {'available' if new_status else 'unavailable'} now",
            "available": new_status
        }), 200
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500