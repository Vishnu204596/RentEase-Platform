# backend/routes/properties.py
from flask import Blueprint, request, jsonify, Response
from datetime import datetime
from bson import ObjectId
from bson.binary import Binary
from database import db
from middleware.auth_middleware import admin_required
from config import ALLOWED_EXTENSIONS

properties_bp = Blueprint('properties', __name__)

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_image_to_db(file, prefix=""):
    """Convert image to binary for MongoDB storage"""
    if not file or file.filename == '':
        return None
    
    if not allowed_file(file.filename):
        raise ValueError("File type not allowed")
    
    # Read file as binary
    binary_data = Binary(file.read())
    
    return {
        'data': binary_data,
        'content_type': file.content_type,
        'filename': file.filename,
        'size': len(binary_data)
    }

@properties_bp.route('/', methods=['POST'])
@admin_required
def add_property():
    """Add new property with images stored in MongoDB"""
    try:
        # Get form data
        title = request.form.get('title')
        property_type = request.form.get('type')
        location = request.form.get('location')
        price = request.form.get('price')
        bedrooms = request.form.get('bedrooms', 1)
        bathrooms = request.form.get('bathrooms', 1)
        amenities = request.form.getlist('amenities')
        description = request.form.get('description', '')
        
        # Validate required fields
        if not all([title, property_type, location, price]):
            return jsonify({
                'success': False, 
                'error': 'Missing required fields'
            }), 400
        
        price = float(price)
        
        # Handle main image
        main_image = request.files.get('main_image')
        main_image_data = None
        
        if main_image and main_image.filename:
            main_image_data = save_image_to_db(main_image, "main_")
        
        # Handle gallery images
        gallery_files = request.files.getlist('gallery_images')
        gallery_images_data = []
        
        for img in gallery_files:
            if img and img.filename:
                try:
                    img_data = save_image_to_db(img, "gallery_")
                    if img_data:
                        gallery_images_data.append(img_data)
                except Exception as e:
                    print(f"Error processing gallery image: {e}")
                    continue
        
        # Create property document with embedded images
        property_data = {
            "title": title,
            "type": property_type,
            "location": location,
            "price": price,
            "bedrooms": int(bedrooms),
            "bathrooms": int(bathrooms),
            "amenities": amenities if amenities else [],
            "description": description,
            "images": {
                "main": main_image_data,
                "gallery": gallery_images_data
            },
            "available": True,
            "owner": request.user.get('name', 'Admin'),
            "createdAt": datetime.utcnow()
        }
        
        # Insert into MongoDB
        result = db.properties.insert_one(property_data)
        
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
    """Edit property with binary image handling - FIXED VERSION"""
    try:
        # Get existing property
        existing = db.properties.find_one({'_id': ObjectId(property_id)})
        if not existing:
            return jsonify({'success': False, 'error': 'Property not found'}), 404
        
        # Start with existing images to preserve them
        update_data = {}
        
        # Update text fields (only if they exist in request)
        if 'title' in request.form:
            update_data['title'] = request.form['title']
        if 'type' in request.form:
            update_data['type'] = request.form['type']
        if 'location' in request.form:
            update_data['location'] = request.form['location']
        if 'price' in request.form:
            update_data['price'] = float(request.form['price'])
        if 'bedrooms' in request.form:
            update_data['bedrooms'] = int(request.form['bedrooms'])
        if 'bathrooms' in request.form:
            update_data['bathrooms'] = int(request.form['bathrooms'])
        if 'description' in request.form:
            update_data['description'] = request.form['description']
        if 'amenities' in request.form:
            update_data['amenities'] = request.form.getlist('amenities')
        if 'available' in request.form:
            available_val = request.form['available']
            update_data['available'] = available_val == 'true' or available_val == True
        
        # IMPORTANT: Preserve existing images by default
        # Start with a copy of existing images
        current_images = existing.get('images', {'main': None, 'gallery': []})
        updated_images = {
            'main': current_images.get('main'),
            'gallery': current_images.get('gallery', []).copy()  # Make a copy
        }
        
        # Handle main image update (only if a new file is uploaded)
        if 'main_image' in request.files and request.files['main_image'].filename:
            # Save new main image to database
            new_main = save_image_to_db(request.files['main_image'], "main_")
            if new_main:
                updated_images['main'] = new_main
        
        # Handle new gallery images (append, don't replace)
        if 'gallery_images' in request.files:
            new_gallery = request.files.getlist('gallery_images')
            for img in new_gallery:
                if img and img.filename:
                    img_data = save_image_to_db(img, "gallery_")
                    if img_data:
                        updated_images['gallery'].append(img_data)
        
        # Delete specific gallery images (by index)
        if 'delete_gallery_indices' in request.form:
            to_delete_indices = request.form.getlist('delete_gallery_indices')
            indices_to_delete = [int(idx) for idx in to_delete_indices if idx.isdigit()]
            
            # Create new gallery without deleted indices
            updated_images['gallery'] = [
                img for idx, img in enumerate(updated_images['gallery']) 
                if idx not in indices_to_delete
            ]
        
        # Only update images if there were changes
        if updated_images != current_images:
            update_data['images'] = updated_images
        
        # Update in database
        if update_data:
            result = db.properties.update_one(
                {'_id': ObjectId(property_id)},
                {'$set': update_data}
            )
            print(f"Updated fields: {list(update_data.keys())}")
            if result.modified_count > 0:
                print(f"Property {property_id} updated successfully")
            else:
                print(f"No changes made to property {property_id}")
        else:
            print(f"No data to update for property {property_id}")
        
        return jsonify({"success": True, "message": "Property updated successfully!"}), 200
        
    except Exception as e:
        print(f"Error editing property: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@properties_bp.route('/image/<property_id>', methods=['GET'])
def get_property_image(property_id):
    """Serve image from MongoDB"""
    try:
        image_type = request.args.get('type', 'main')
        index = request.args.get('index', 0, type=int)
        
        property_data = db.properties.find_one({'_id': ObjectId(property_id)})
        
        if not property_data:
            return jsonify({'error': 'Property not found'}), 404
        
        if image_type == 'main':
            image_data = property_data.get('images', {}).get('main')
        else:
            gallery = property_data.get('images', {}).get('gallery', [])
            if index < len(gallery):
                image_data = gallery[index]
            else:
                return jsonify({'error': 'Image not found'}), 404
        
        if not image_data or not image_data.get('data'):
            # Return a simple SVG placeholder
            placeholder = b'<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#cccccc"/><text x="50%" y="50%" font-size="20" text-anchor="middle" fill="#666666">No Image</text></svg>'
            return Response(placeholder, mimetype='image/svg+xml')
        
        return Response(
            image_data['data'],
            mimetype=image_data.get('content_type', 'image/jpeg')
        )
        
    except Exception as e:
        print(f"Error serving image: {str(e)}")
        return jsonify({'error': str(e)}), 500

# backend/routes/properties.py - Update the get_all_properties function

@properties_bp.route('/', methods=['GET'])
def get_all_properties():
    """Get all properties (without image binary data)"""
    try:
        property_type = request.args.get('type')
        min_price = request.args.get('min_price')
        max_price = request.args.get('max_price')
        location = request.args.get('location')
        
        # IMPORTANT: Only show available properties to public
        # Check if the request is from admin (by checking for admin token)
        # For simplicity, we'll show all properties to everyone but mark availability
        query = {}
        
        # For public users, only show available properties
        # Since we don't have user context here, we'll show all but frontend will filter
        # Actually, let's filter only available properties for non-admin views
        # But since we don't know if it's admin, let's just show all and let frontend handle?
        # Better: Return all properties with availability status
        
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
        
        # Project to exclude binary data
        properties = list(db.properties.find(
            query, 
            {'images.main.data': 0, 'images.gallery.data': 0}
        ).sort('createdAt', -1))
        
        # Convert ObjectId and add image URLs
        for prop in properties:
            prop['_id'] = str(prop['_id'])
            if prop.get('images', {}).get('main'):
                prop['images']['main'] = f"/api/properties/image/{prop['_id']}?type=main"
            if prop.get('images', {}).get('gallery'):
                prop['images']['gallery'] = [
                    f"/api/properties/image/{prop['_id']}?type=gallery&index={i}" 
                    for i in range(len(prop['images']['gallery']))
                ]
        
        return jsonify({
            'success': True,
            'count': len(properties),
            'properties': properties
        }), 200
        
    except Exception as e:
        print(f"Error getting properties: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@properties_bp.route('/<property_id>', methods=['GET'])
def get_property(property_id):
    """Get single property details"""
    try:
        property_data = db.properties.find_one({'_id': ObjectId(property_id)})
        
        if not property_data:
            return jsonify({'success': False, 'error': 'Property not found'}), 404
        
        property_data['_id'] = str(property_data['_id'])
        
        # Replace binary data with image URLs
        if property_data.get('images', {}).get('main'):
            property_data['images']['main'] = f"/api/properties/image/{property_data['_id']}?type=main"
        if property_data.get('images', {}).get('gallery'):
            property_data['images']['gallery'] = [
                f"/api/properties/image/{property_data['_id']}?type=gallery&index={i}" 
                for i in range(len(property_data['images']['gallery']))
            ]
        
        return jsonify({
            'success': True,
            'property': property_data
        }), 200
        
    except Exception as e:
        print(f"Error getting property: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@properties_bp.route('/<property_id>', methods=['DELETE'])
@admin_required
def delete_property(property_id):
    """Delete property (images automatically deleted with document)"""
    try:
        result = db.properties.delete_one({'_id': ObjectId(property_id)})
        
        if result.deleted_count == 0:
            return jsonify({'success': False, 'error': 'Property not found'}), 404
        
        return jsonify({"success": True, "message": "Property deleted successfully!"}), 200
        
    except Exception as e:
        print(f"Error deleting property: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@properties_bp.route('/toggle-availability/<property_id>', methods=['PATCH'])
@admin_required
def toggle_availability(property_id):
    """Toggle property availability"""
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
        print(f"Error toggling availability: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500