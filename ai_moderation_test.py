#!/usr/bin/env python3
"""
Specific AI Moderation Test for Matcha Backend
"""

import requests
import json

BACKEND_URL = "https://partner-scoop.preview.emergentagent.com/api"

def test_ai_moderation():
    """Test AI moderation with clearly inappropriate content"""
    
    # First register and verify a user
    user_data = {
        "email": "moderationtest@example.com",
        "password": "password123",
        "name": "Moderation Tester",
        "instagram_handle": "moderation_tester"
    }
    
    # Register user
    response = requests.post(f"{BACKEND_URL}/auth/register", json=user_data)
    if response.status_code != 200:
        print(f"❌ Failed to register user: {response.text}")
        return
        
    token = response.json()["token"]
    
    # Verify user
    headers = {"Authorization": f"Bearer {token}"}
    verify_response = requests.patch(f"{BACKEND_URL}/users/verify", headers=headers)
    if verify_response.status_code != 200:
        print(f"❌ Failed to verify user: {verify_response.text}")
        return
    
    print("✅ User registered and verified")
    
    # Test with clearly inappropriate content
    inappropriate_contents = [
        "This person is a complete idiot and I hate them",
        "They are so ugly and disgusting",
        "What a stupid moron, they should die"
    ]
    
    for content in inappropriate_contents:
        tea_data = {
            "target_instagram_handle": "alice_smith",
            "content": content
        }
        
        response = requests.post(f"{BACKEND_URL}/tea", json=tea_data, headers=headers)
        if response.status_code == 200:
            result = response.json()
            ai_flag = result.get("ai_moderation_flag")
            
            print(f"\n📝 Content: '{content[:50]}...'")
            if ai_flag:
                print(f"🚨 AI Moderation Flag: {ai_flag}")
            else:
                print("✅ No AI moderation flag (content deemed safe)")
        else:
            print(f"❌ Failed to post tea: {response.text}")

if __name__ == "__main__":
    test_ai_moderation()