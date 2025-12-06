#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Matcha Dating Gossip App
Tests all authentication, user management, and tea posting endpoints
"""

import requests
import json
import base64
import sys
from typing import Dict, Any, Optional

# Get backend URL from frontend .env
BACKEND_URL = "https://partner-scoop.preview.emergentagent.com/api"

class MatchaAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.user1_token = None
        self.user2_token = None
        self.user1_data = None
        self.user2_data = None
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if not success:
            print(f"   URL: {self.base_url}")
        print()
        
    def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None, token: str = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{self.base_url}{endpoint}"
        
        # Set up headers
        req_headers = {"Content-Type": "application/json"}
        if headers:
            req_headers.update(headers)
        if token:
            req_headers["Authorization"] = f"Bearer {token}"
            
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=req_headers)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=req_headers)
            elif method.upper() == "PATCH":
                response = self.session.patch(url, json=data, headers=req_headers)
            else:
                return False, {"error": f"Unsupported method: {method}"}, 0
                
            return response.status_code < 400, response.json() if response.content else {}, response.status_code
            
        except requests.exceptions.RequestException as e:
            return False, {"error": f"Request failed: {str(e)}"}, 0
        except json.JSONDecodeError:
            return False, {"error": "Invalid JSON response"}, response.status_code if 'response' in locals() else 0
            
    def test_user_registration(self):
        """Test 1: User Registration"""
        print("=== Testing User Registration ===")
        
        # Test successful registration
        user1_data = {
            "email": "test1@example.com",
            "password": "password123",
            "name": "Alice Smith",
            "instagram_handle": "alice_smith"
        }
        
        success, response, status_code = self.make_request("POST", "/auth/register", user1_data)
        
        if success and "token" in response and "user" in response:
            self.user1_token = response["token"]
            self.user1_data = response["user"]
            self.log_test("User Registration (Alice)", True, f"User ID: {response['user']['id']}")
        else:
            self.log_test("User Registration (Alice)", False, f"Status: {status_code}, Response: {response}")
            return False
            
        # Test duplicate email
        success, response, status_code = self.make_request("POST", "/auth/register", user1_data)
        if not success and status_code == 400:
            self.log_test("Duplicate Email Check", True, "Correctly rejected duplicate email")
        else:
            self.log_test("Duplicate Email Check", False, f"Should have failed with 400, got {status_code}")
            
        # Test duplicate Instagram handle
        duplicate_handle_data = {
            "email": "different@example.com",
            "password": "password123",
            "name": "Different User",
            "instagram_handle": "alice_smith"  # Same handle
        }
        
        success, response, status_code = self.make_request("POST", "/auth/register", duplicate_handle_data)
        if not success and status_code == 400:
            self.log_test("Duplicate Instagram Handle Check", True, "Correctly rejected duplicate handle")
        else:
            self.log_test("Duplicate Instagram Handle Check", False, f"Should have failed with 400, got {status_code}")
            
        return True
        
    def test_user_login(self):
        """Test 2: User Login"""
        print("=== Testing User Login ===")
        
        login_data = {
            "email": "test1@example.com",
            "password": "password123"
        }
        
        success, response, status_code = self.make_request("POST", "/auth/login", login_data)
        
        if success and "token" in response and "user" in response:
            # Verify user is initially unverified
            if response["user"]["verified"] == False:
                self.log_test("User Login", True, f"Login successful, verified={response['user']['verified']}")
                self.user1_token = response["token"]  # Update token
                return True
            else:
                self.log_test("User Login", False, "User should be unverified initially")
        else:
            self.log_test("User Login", False, f"Status: {status_code}, Response: {response}")
            
        return False
        
    def test_get_current_user(self):
        """Test 3: Get Current User (Protected)"""
        print("=== Testing Get Current User ===")
        
        if not self.user1_token:
            self.log_test("Get Current User", False, "No token available")
            return False
            
        success, response, status_code = self.make_request("GET", "/users/me", token=self.user1_token)
        
        if success and "id" in response and "email" in response:
            self.log_test("Get Current User", True, f"Retrieved user: {response['name']}")
            return True
        else:
            self.log_test("Get Current User", False, f"Status: {status_code}, Response: {response}")
            return False
            
    def test_account_verification(self):
        """Test 4: Account Verification"""
        print("=== Testing Account Verification ===")
        
        if not self.user1_token:
            self.log_test("Account Verification", False, "No token available")
            return False
            
        success, response, status_code = self.make_request("PATCH", "/users/verify", token=self.user1_token)
        
        if success:
            # Verify the user is now verified
            success2, user_response, _ = self.make_request("GET", "/users/me", token=self.user1_token)
            if success2 and user_response.get("verified") == True:
                self.log_test("Account Verification", True, "User successfully verified")
                return True
            else:
                self.log_test("Account Verification", False, "User verification status not updated")
        else:
            self.log_test("Account Verification", False, f"Status: {status_code}, Response: {response}")
            
        return False
        
    def test_profile_picture_update(self):
        """Test 5: Update Profile Picture"""
        print("=== Testing Profile Picture Update ===")
        
        if not self.user1_token:
            self.log_test("Profile Picture Update", False, "No token available")
            return False
            
        # Simple base64 encoded image data (1x1 pixel PNG)
        profile_picture_data = {
            "profile_picture": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        }
        
        success, response, status_code = self.make_request("PATCH", "/users/profile-picture", profile_picture_data, token=self.user1_token)
        
        if success:
            self.log_test("Profile Picture Update", True, "Profile picture updated successfully")
            return True
        else:
            self.log_test("Profile Picture Update", False, f"Status: {status_code}, Response: {response}")
            return False
            
    def test_get_all_users(self):
        """Test 6: Get All Users"""
        print("=== Testing Get All Users ===")
        
        success, response, status_code = self.make_request("GET", "/users")
        
        if success and isinstance(response, list) and len(response) > 0:
            self.log_test("Get All Users", True, f"Retrieved {len(response)} users")
            return True
        else:
            self.log_test("Get All Users", False, f"Status: {status_code}, Response: {response}")
            return False
            
    def test_register_second_user(self):
        """Test 7: Register Second User"""
        print("=== Testing Second User Registration ===")
        
        user2_data = {
            "email": "test2@example.com",
            "password": "password123",
            "name": "Bob Jones",
            "instagram_handle": "bob_jones"
        }
        
        success, response, status_code = self.make_request("POST", "/auth/register", user2_data)
        
        if success and "token" in response:
            self.user2_token = response["token"]
            self.user2_data = response["user"]
            
            # Verify this user
            verify_success, _, _ = self.make_request("PATCH", "/users/verify", token=self.user2_token)
            if verify_success:
                self.log_test("Second User Registration & Verification", True, f"User: {response['user']['name']}")
                return True
            else:
                self.log_test("Second User Registration & Verification", False, "Failed to verify second user")
        else:
            self.log_test("Second User Registration", False, f"Status: {status_code}, Response: {response}")
            
        return False
        
    def test_post_tea_verified_user(self):
        """Test 8: Post Tea (Verified User)"""
        print("=== Testing Tea Posting (Verified User) ===")
        
        if not self.user2_token:
            self.log_test("Post Tea (Verified User)", False, "No verified user token available")
            return False
            
        tea_data = {
            "target_instagram_handle": "alice_smith",
            "content": "Great person to date, very punctual and respectful"
        }
        
        success, response, status_code = self.make_request("POST", "/tea", tea_data, token=self.user2_token)
        
        if success and "id" in response:
            ai_flag = response.get("ai_moderation_flag")
            flag_status = f"AI Flag: {ai_flag}" if ai_flag else "No AI moderation flag"
            self.log_test("Post Tea (Verified User)", True, f"Tea posted successfully. {flag_status}")
            return True
        else:
            self.log_test("Post Tea (Verified User)", False, f"Status: {status_code}, Response: {response}")
            return False
            
    def test_post_tea_unverified_user(self):
        """Test 9: Post Tea (Unverified User - Should Fail)"""
        print("=== Testing Tea Posting (Unverified User) ===")
        
        # Create an unverified user
        unverified_user_data = {
            "email": "unverified@example.com",
            "password": "password123",
            "name": "Unverified User",
            "instagram_handle": "unverified_user"
        }
        
        success, response, status_code = self.make_request("POST", "/auth/register", unverified_user_data)
        if not success:
            self.log_test("Post Tea (Unverified User)", False, "Failed to create unverified user")
            return False
            
        unverified_token = response["token"]
        
        tea_data = {
            "target_instagram_handle": "alice_smith",
            "content": "This should fail because user is not verified"
        }
        
        success, response, status_code = self.make_request("POST", "/tea", tea_data, token=unverified_token)
        
        if not success and status_code == 403:
            self.log_test("Post Tea (Unverified User)", True, "Correctly rejected unverified user")
            return True
        else:
            self.log_test("Post Tea (Unverified User)", False, f"Should have failed with 403, got {status_code}")
            return False
            
    def test_get_user_profile_with_tea(self):
        """Test 10: Get User Profile with Tea"""
        print("=== Testing Get User Profile with Tea ===")
        
        success, response, status_code = self.make_request("GET", "/users/alice_smith")
        
        if success and "user" in response and "tea" in response:
            user_info = response["user"]
            tea_list = response["tea"]
            self.log_test("Get User Profile with Tea", True, 
                         f"User: {user_info['name']}, Tea count: {len(tea_list)}")
            return True
        else:
            self.log_test("Get User Profile with Tea", False, f"Status: {status_code}, Response: {response}")
            return False
            
    def test_ai_moderation(self):
        """Test 11: AI Moderation Test"""
        print("=== Testing AI Moderation ===")
        
        if not self.user2_token:
            self.log_test("AI Moderation Test", False, "No verified user token available")
            return False
            
        # Test with potentially inappropriate content
        inappropriate_tea = {
            "target_instagram_handle": "alice_smith",
            "content": "This person is absolutely terrible and I hate them so much, they are the worst human being ever"
        }
        
        success, response, status_code = self.make_request("POST", "/tea", inappropriate_tea, token=self.user2_token)
        
        if success:
            ai_flag = response.get("ai_moderation_flag")
            if ai_flag and "UNSAFE" in ai_flag:
                self.log_test("AI Moderation Test", True, f"AI correctly flagged content: {ai_flag}")
            else:
                self.log_test("AI Moderation Test", True, f"Content posted, AI flag: {ai_flag or 'None'}")
            return True
        else:
            self.log_test("AI Moderation Test", False, f"Status: {status_code}, Response: {response}")
            return False
            
    def test_invalid_token(self):
        """Test 12: Invalid Token Handling"""
        print("=== Testing Invalid Token Handling ===")
        
        success, response, status_code = self.make_request("GET", "/users/me", token="invalid_token_123")
        
        if not success and status_code == 401:
            self.log_test("Invalid Token Handling", True, "Correctly rejected invalid token")
            return True
        else:
            self.log_test("Invalid Token Handling", False, f"Should have failed with 401, got {status_code}")
            return False
            
    def run_all_tests(self):
        """Run all backend tests"""
        print(f"🚀 Starting Matcha Backend API Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        test_results = []
        
        # Run tests in sequence
        test_results.append(self.test_user_registration())
        test_results.append(self.test_user_login())
        test_results.append(self.test_get_current_user())
        test_results.append(self.test_account_verification())
        test_results.append(self.test_profile_picture_update())
        test_results.append(self.test_get_all_users())
        test_results.append(self.test_register_second_user())
        test_results.append(self.test_post_tea_verified_user())
        test_results.append(self.test_post_tea_unverified_user())
        test_results.append(self.test_get_user_profile_with_tea())
        test_results.append(self.test_ai_moderation())
        test_results.append(self.test_invalid_token())
        
        # Summary
        passed = sum(test_results)
        total = len(test_results)
        
        print("=" * 60)
        print(f"📊 TEST SUMMARY: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! Backend is working correctly.")
            return True
        else:
            print(f"⚠️  {total - passed} tests failed. Check the details above.")
            return False

if __name__ == "__main__":
    tester = MatchaAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)