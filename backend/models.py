# backend/models.py
from datetime import datetime
from bson import ObjectId

# Helper to convert ObjectId to string for JSON responses
def serialize_doc(doc):
    if doc is None:
        return None
    doc['_id'] = str(doc['_id'])
    return doc

# User Model
class User:
    def __init__(self, name, email, password, role='tenant', phone=None, alternate_phone=None, address=None):
        self.name = name
        self.email = email
        self.password = password
        self.role = role  # 'admin' or 'tenant'
        self.phone = phone
        self.alternate_phone = alternate_phone
        self.address = address
        self.createdAt = datetime.utcnow()
    
    def to_dict(self):
        return {
            'name': self.name,
            'email': self.email,
            'password': self.password,
            'role': self.role,
            'phone': self.phone,
            'alternate_phone': self.alternate_phone,
            'address': self.address,
            'createdAt': self.createdAt
        }

# Property Model
class Property:
    def __init__(self, title, type, location, price, bedrooms=1, bathrooms=1, 
                 amenities=None, available=True, description='', images=None):
        self.title = title
        self.type = type  # 'apartment', 'pg', 'villa', 'house'
        self.location = location
        self.price = price
        self.bedrooms = bedrooms
        self.bathrooms = bathrooms
        self.amenities = amenities or []
        self.available = available
        self.description = description
        self.images = images or {'main': None, 'gallery': []}
        self.createdAt = datetime.utcnow()
    
    def to_dict(self):
        return {
            'title': self.title,
            'type': self.type,
            'location': self.location,
            'price': self.price,
            'bedrooms': self.bedrooms,
            'bathrooms': self.bathrooms,
            'amenities': self.amenities,
            'available': self.available,
            'description': self.description,
            'images': self.images,
            'createdAt': self.createdAt
        }

# Booking Model
class Booking:
    def __init__(self, propertyId, tenantId, startDate, endDate, message='', status='pending'):
        self.propertyId = propertyId
        self.tenantId = tenantId
        self.startDate = startDate
        self.endDate = endDate
        self.message = message
        self.status = status  # 'pending', 'accepted', 'rejected'
        self.createdAt = datetime.utcnow()
    
    def to_dict(self):
        return {
            'propertyId': self.propertyId,
            'tenantId': self.tenantId,
            'startDate': self.startDate,
            'endDate': self.endDate,
            'message': self.message,
            'status': self.status,
            'createdAt': self.createdAt
        }