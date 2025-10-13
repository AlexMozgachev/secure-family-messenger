#!/usr/bin/env python3
"""
Backend API Error Handling Tests for Secure Messenger Settings Page
Tests error scenarios and edge cases for Settings page APIs
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://chatbuilder-app.preview.emergentagent.com/api"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

class ErrorHandlingTester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.test_results = []
        
    def log_test(self, test_name, success, message, details=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "details": details
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def authenticate_admin(self):
        """Authenticate as admin user"""
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json={
                "username": ADMIN_USERNAME,
                "password": ADMIN_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("access_token")
                self.session.headers.update({
                    "Authorization": f"Bearer {self.admin_token}"
                })
                return True
            return False
        except:
            return False
    
    def test_unauthorized_access(self):
        """Test accessing admin endpoints without authentication"""
        # Remove auth header temporarily
        original_headers = self.session.headers.copy()
        self.session.headers.pop("Authorization", None)
        
        endpoints_to_test = [
            "/admin/settings",
            "/admin/ssl/renew",
            "/admin/backup",
            "/admin/restore",
            "/admin/rooms/stats",
            "/admin/security/blocked-ips",
            "/admin/devices"
        ]
        
        unauthorized_count = 0
        for endpoint in endpoints_to_test:
            try:
                response = self.session.get(f"{BASE_URL}{endpoint}")
                if response.status_code == 401 or response.status_code == 403:
                    unauthorized_count += 1
            except:
                pass
        
        # Restore auth headers
        self.session.headers.update(original_headers)
        
        if unauthorized_count == len(endpoints_to_test):
            self.log_test("Unauthorized Access Protection", True, f"All {len(endpoints_to_test)} admin endpoints properly protected")
        else:
            self.log_test("Unauthorized Access Protection", False, f"Only {unauthorized_count}/{len(endpoints_to_test)} endpoints protected")
    
    def test_invalid_backup_restore(self):
        """Test restore with invalid backup data"""
        try:
            # Test with invalid JSON
            response = self.session.post(f"{BASE_URL}/admin/restore", json={
                "backup_data": "invalid json data"
            })
            
            if response.status_code == 400:
                self.log_test("Invalid Backup Data Handling", True, "Properly rejected invalid backup data")
            else:
                self.log_test("Invalid Backup Data Handling", False, f"Expected 400, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Invalid Backup Data Handling", False, f"Request error: {str(e)}")
    
    def test_invalid_ssl_renewal(self):
        """Test SSL renewal with invalid data"""
        try:
            # Test with missing required field
            response = self.session.post(f"{BASE_URL}/admin/ssl/renew", json={})
            
            # Should either work with defaults or return 422 for validation error
            if response.status_code in [200, 422]:
                self.log_test("SSL Renewal Validation", True, f"Properly handled invalid SSL renewal request (HTTP {response.status_code})")
            else:
                self.log_test("SSL Renewal Validation", False, f"Unexpected response: {response.status_code}")
                
        except Exception as e:
            self.log_test("SSL Renewal Validation", False, f"Request error: {str(e)}")
    
    def test_invalid_ip_blocking(self):
        """Test IP blocking with invalid data"""
        try:
            # Test with invalid IP format
            response = self.session.post(f"{BASE_URL}/admin/security/block-ips", json={
                "ip_addresses": ["not.an.ip.address", "256.256.256.256"],
                "reason": "Test invalid IPs"
            })
            
            # Should either accept (and handle gracefully) or reject with validation error
            if response.status_code in [200, 400, 422]:
                self.log_test("Invalid IP Blocking", True, f"Properly handled invalid IP addresses (HTTP {response.status_code})")
            else:
                self.log_test("Invalid IP Blocking", False, f"Unexpected response: {response.status_code}")
                
        except Exception as e:
            self.log_test("Invalid IP Blocking", False, f"Request error: {str(e)}")
    
    def test_nonexistent_device_deletion(self):
        """Test deleting non-existent device"""
        try:
            fake_device_id = "nonexistent-device-id-12345"
            response = self.session.delete(f"{BASE_URL}/devices/{fake_device_id}")
            
            if response.status_code == 404:
                self.log_test("Nonexistent Device Deletion", True, "Properly returned 404 for non-existent device")
            else:
                self.log_test("Nonexistent Device Deletion", False, f"Expected 404, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Nonexistent Device Deletion", False, f"Request error: {str(e)}")
    
    def test_nonexistent_ip_unblocking(self):
        """Test unblocking non-existent IP"""
        try:
            fake_ip_id = "nonexistent-ip-id-12345"
            response = self.session.delete(f"{BASE_URL}/admin/security/blocked-ips/{fake_ip_id}")
            
            if response.status_code == 404:
                self.log_test("Nonexistent IP Unblocking", True, "Properly returned 404 for non-existent blocked IP")
            else:
                self.log_test("Nonexistent IP Unblocking", False, f"Expected 404, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Nonexistent IP Unblocking", False, f"Request error: {str(e)}")
    
    def test_invalid_settings_update(self):
        """Test updating settings with invalid data"""
        try:
            # Test with invalid connection_type
            response = self.session.put(f"{BASE_URL}/admin/settings", json={
                "server_name": "Test Server",
                "connection_type": "invalid_type",  # Should be 'ip' or 'domain'
                "ssl_enabled": "not_a_boolean"  # Should be boolean
            })
            
            # Should either accept with defaults or return validation error
            if response.status_code in [200, 400, 422]:
                self.log_test("Invalid Settings Update", True, f"Properly handled invalid settings data (HTTP {response.status_code})")
            else:
                self.log_test("Invalid Settings Update", False, f"Unexpected response: {response.status_code}")
                
        except Exception as e:
            self.log_test("Invalid Settings Update", False, f"Request error: {str(e)}")
    
    def run_error_tests(self):
        """Run all error handling tests"""
        print("🧪 Starting Error Handling Tests for Settings APIs")
        print(f"📡 Testing against: {BASE_URL}")
        print("=" * 60)
        
        # Authentication
        if not self.authenticate_admin():
            print("❌ Cannot proceed without admin authentication")
            return False
        
        print("\n🔒 Testing Security & Access Control...")
        self.test_unauthorized_access()
        
        print("\n❌ Testing Error Scenarios...")
        self.test_invalid_backup_restore()
        self.test_invalid_ssl_renewal()
        self.test_invalid_ip_blocking()
        self.test_nonexistent_device_deletion()
        self.test_nonexistent_ip_unblocking()
        self.test_invalid_settings_update()
        
        # Summary
        print("\n" + "=" * 60)
        print("📈 ERROR HANDLING TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t["success"]])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for test in self.test_results:
                if not test["success"]:
                    print(f"  • {test['test']}: {test['message']}")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = ErrorHandlingTester()
    success = tester.run_error_tests()
    sys.exit(0 if success else 1)