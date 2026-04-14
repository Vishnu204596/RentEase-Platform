import requests
import json

# First login
print("=== LOGGING IN ===")
login_response = requests.post('http://localhost:5000/api/auth/login', json={
    "email": "jack0120001@gmail.com",  # Your tenant email
    "password": "jack1234"  # Your tenant password
})

if login_response.status_code == 200:
    data = login_response.json()
    token = data['token']
    user = data['user']
    print(f"✅ Logged in as: {user['name']} ({user['role']})")
    print(f"Token: {token[:50]}...\n")
    
    # Get a property ID first
    print("=== GETTING PROPERTIES ===")
    props_response = requests.get('http://localhost:5000/api/properties/')
    if props_response.status_code == 200:
        props = props_response.json()
        if props['success'] and len(props['properties']) > 0:
            property_id = props['properties'][0]['_id']
            print(f"✅ Found property: {props['properties'][0]['title']}")
            print(f"Property ID: {property_id}\n")
            
            # Create a booking
            print("=== CREATING BOOKING ===")
            booking_data = {
                "propertyId": property_id,
                "startDate": "2026-04-20",
                "endDate": "2026-04-20",
                "message": "Test booking from Python script"
            }
            
            headers = {
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
            
            booking_response = requests.post(
                'http://localhost:5000/api/bookings/',
                json=booking_data,
                headers=headers
            )
            
            print(f"Status: {booking_response.status_code}")
            print(f"Response: {booking_response.json()}\n")
            
            # Get my bookings
            print("=== GETTING MY BOOKINGS ===")
            my_bookings = requests.get(
                'http://localhost:5000/api/bookings/my',
                headers=headers
            )
            print(f"Status: {my_bookings.status_code}")
            print(f"Response: {my_bookings.json()}")
        else:
            print("❌ No properties found!")
    else:
        print(f"❌ Failed to get properties: {props_response.status_code}")
else:
    print(f"❌ Login failed: {login_response.status_code}")
    print(f"Response: {login_response.text}")