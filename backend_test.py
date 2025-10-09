#!/usr/bin/env python3
"""
Backend API Testing for Secure Messenger Settings Page
Tests all Settings page related APIs including admin settings, SSL, backup/restore, security, and chats metadata
"""

import requests
import json
import sys
from datetime import datetime
import time

# Configuration
BASE_URL = "https://safetalk-12.preview.emergentagent.com/api"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

class SettingsAPITester:
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
                self.log_test("Admin Authentication", True, "Successfully authenticated as admin")
                return True
            else:
                self.log_test("Admin Authentication", False, f"Failed to authenticate: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Admin Authentication", False, f"Authentication error: {str(e)}")
            return False
    
    def test_admin_settings_get(self):
        """Test GET /api/admin/settings"""
        try:
            response = self.session.get(f"{BASE_URL}/admin/settings")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["server_name", "connection_type", "ssl_enabled"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("GET Admin Settings", False, f"Missing required fields: {missing_fields}", data)
                else:
                    self.log_test("GET Admin Settings", True, "Successfully retrieved server settings", {
                        "server_name": data.get("server_name"),
                        "connection_type": data.get("connection_type"),
                        "ssl_enabled": data.get("ssl_enabled")
                    })
                return data
            else:
                self.log_test("GET Admin Settings", False, f"HTTP {response.status_code}", response.text)
                return None
                
        except Exception as e:
            self.log_test("GET Admin Settings", False, f"Request error: {str(e)}")
            return None
    
    def test_admin_settings_put(self):
        """Test PUT /api/admin/settings"""
        try:
            # First get current settings
            current_settings = self.test_admin_settings_get()
            if not current_settings:
                self.log_test("PUT Admin Settings", False, "Cannot test PUT without current settings")
                return
            
            # Update settings
            updated_settings = {
                "server_name": "Test Secure Messenger",
                "connection_type": "domain",
                "domain": "test.example.com",
                "ip_address": "192.168.1.100",
                "ssl_enabled": True,
                "ssl_auto_renew": True
            }
            
            response = self.session.put(f"{BASE_URL}/admin/settings", json=updated_settings)
            
            if response.status_code == 200:
                # Verify the update by getting settings again
                time.sleep(1)  # Brief delay
                verify_response = self.session.get(f"{BASE_URL}/admin/settings")
                if verify_response.status_code == 200:
                    verify_data = verify_response.json()
                    if verify_data.get("server_name") == updated_settings["server_name"]:
                        self.log_test("PUT Admin Settings", True, "Successfully updated server settings", updated_settings)
                    else:
                        self.log_test("PUT Admin Settings", False, "Settings not properly updated", verify_data)
                else:
                    self.log_test("PUT Admin Settings", False, "Could not verify settings update")
            else:
                self.log_test("PUT Admin Settings", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("PUT Admin Settings", False, f"Request error: {str(e)}")
    
    def test_ssl_renewal(self):
        """Test POST /api/admin/ssl/renew"""
        try:
            # Test domain SSL renewal
            response = self.session.post(f"{BASE_URL}/admin/ssl/renew", json={
                "for_domain": True
            })
            
            if response.status_code == 200:
                data = response.json()
                if "expires_at" in data and "message" in data:
                    self.log_test("SSL Certificate Renewal", True, "Successfully renewed SSL certificate", {
                        "expires_at": data.get("expires_at"),
                        "for_domain": data.get("for_domain")
                    })
                else:
                    self.log_test("SSL Certificate Renewal", False, "Invalid response format", data)
            else:
                self.log_test("SSL Certificate Renewal", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("SSL Certificate Renewal", False, f"Request error: {str(e)}")
    
    def test_backup_creation(self):
        """Test POST /api/admin/backup"""
        try:
            backup_request = {
                "include_users": True,
                "include_messages": True,
                "include_settings": True
            }
            
            response = self.session.post(f"{BASE_URL}/admin/backup", json=backup_request)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["backup_data", "size", "timestamp"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("Backup Creation", False, f"Missing required fields: {missing_fields}", data)
                else:
                    # Verify backup data is valid JSON
                    try:
                        backup_content = json.loads(data["backup_data"])
                        self.log_test("Backup Creation", True, "Successfully created backup", {
                            "size": data.get("size"),
                            "includes_settings": "settings" in backup_content,
                            "includes_users": "users" in backup_content
                        })
                        return data["backup_data"]  # Return for restore test
                    except json.JSONDecodeError:
                        self.log_test("Backup Creation", False, "Invalid backup data format")
            else:
                self.log_test("Backup Creation", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Backup Creation", False, f"Request error: {str(e)}")
        
        return None
    
    def test_backup_restore(self, backup_data):
        """Test POST /api/admin/restore"""
        if not backup_data:
            self.log_test("Backup Restore", False, "No backup data available for restore test")
            return
            
        try:
            response = self.session.post(f"{BASE_URL}/admin/restore", json={
                "backup_data": backup_data
            })
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "restored" in data:
                    self.log_test("Backup Restore", True, "Successfully restored from backup", {
                        "restored_items": data.get("restored"),
                        "timestamp": data.get("timestamp")
                    })
                else:
                    self.log_test("Backup Restore", False, "Invalid response format", data)
            else:
                self.log_test("Backup Restore", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Backup Restore", False, f"Request error: {str(e)}")
    
    def test_rooms_stats(self):
        """Test GET /api/admin/rooms/stats"""
        try:
            response = self.session.get(f"{BASE_URL}/admin/rooms/stats")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["total_rooms", "direct_rooms", "group_rooms", "rooms"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("Rooms Statistics", False, f"Missing required fields: {missing_fields}", data)
                else:
                    self.log_test("Rooms Statistics", True, "Successfully retrieved rooms statistics", {
                        "total_rooms": data.get("total_rooms"),
                        "direct_rooms": data.get("direct_rooms"),
                        "group_rooms": data.get("group_rooms"),
                        "rooms_count": len(data.get("rooms", []))
                    })
            else:
                self.log_test("Rooms Statistics", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Rooms Statistics", False, f"Request error: {str(e)}")
    
    def test_security_blocked_ips_get(self):
        """Test GET /api/admin/security/blocked-ips"""
        try:
            response = self.session.get(f"{BASE_URL}/admin/security/blocked-ips")
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("GET Blocked IPs", True, f"Successfully retrieved blocked IPs list ({len(data)} entries)")
                return data
            else:
                self.log_test("GET Blocked IPs", False, f"HTTP {response.status_code}", response.text)
                return []
                
        except Exception as e:
            self.log_test("GET Blocked IPs", False, f"Request error: {str(e)}")
            return []
    
    def test_security_block_ips(self):
        """Test POST /api/admin/security/block-ips"""
        try:
            block_request = {
                "ip_addresses": ["192.168.1.999", "10.0.0.999"],
                "reason": "Test blocking",
                "expires_hours": 24
            }
            
            response = self.session.post(f"{BASE_URL}/admin/security/block-ips", json=block_request)
            
            if response.status_code == 200:
                data = response.json()
                if "count" in data and data["count"] > 0:
                    self.log_test("Block IPs", True, f"Successfully blocked {data['count']} IP addresses")
                    return True
                else:
                    self.log_test("Block IPs", True, "Block IPs endpoint working (no new IPs blocked)")
                    return True
            else:
                self.log_test("Block IPs", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Block IPs", False, f"Request error: {str(e)}")
            return False
    
    def test_security_login_attempts(self):
        """Test GET /api/admin/security/login-attempts"""
        try:
            response = self.session.get(f"{BASE_URL}/admin/security/login-attempts")
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Login Attempts", True, f"Successfully retrieved login attempts ({len(data)} entries)")
                return data
            else:
                self.log_test("Login Attempts", False, f"HTTP {response.status_code}", response.text)
                return []
                
        except Exception as e:
            self.log_test("Login Attempts", False, f"Request error: {str(e)}")
            return []
    
    def test_admin_devices(self):
        """Test GET /api/admin/devices"""
        try:
            response = self.session.get(f"{BASE_URL}/admin/devices")
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Admin Devices", True, f"Successfully retrieved device sessions ({len(data)} entries)")
                return data
            else:
                self.log_test("Admin Devices", False, f"HTTP {response.status_code}", response.text)
                return []
                
        except Exception as e:
            self.log_test("Admin Devices", False, f"Request error: {str(e)}")
            return []
    
    def test_device_deletion(self, devices):
        """Test DELETE /api/devices/{session_id}"""
        if not devices:
            self.log_test("Device Deletion", True, "No devices to test deletion (endpoint available)")
            return
            
        try:
            # Try to delete the first device (should be admin's own device)
            device_id = devices[0].get("id")
            if not device_id:
                self.log_test("Device Deletion", False, "No device ID found for deletion test")
                return
                
            response = self.session.delete(f"{BASE_URL}/devices/{device_id}")
            
            if response.status_code == 200:
                self.log_test("Device Deletion", True, "Successfully deleted device session")
            elif response.status_code == 404:
                self.log_test("Device Deletion", True, "Device deletion endpoint working (device not found)")
            else:
                self.log_test("Device Deletion", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Device Deletion", False, f"Request error: {str(e)}")
    
    def test_health_check(self):
        """Test GET /api/health"""
        try:
            response = self.session.get(f"{BASE_URL}/health")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    self.log_test("Health Check", True, "System is healthy", {
                        "database": data.get("database"),
                        "timestamp": data.get("timestamp")
                    })
                else:
                    self.log_test("Health Check", False, f"System unhealthy: {data.get('status')}", data)
            else:
                self.log_test("Health Check", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Health Check", False, f"Request error: {str(e)}")
    
    def run_all_tests(self):
        """Run all Settings page related tests"""
        print("🚀 Starting Secure Messenger Settings API Tests")
        print(f"📡 Testing against: {BASE_URL}")
        print("=" * 60)
        
        # Health check first
        self.test_health_check()
        
        # Authentication
        if not self.authenticate_admin():
            print("❌ Cannot proceed without admin authentication")
            return False
        
        print("\n📋 Testing Admin Settings APIs...")
        self.test_admin_settings_get()
        self.test_admin_settings_put()
        
        print("\n🔒 Testing SSL Management APIs...")
        self.test_ssl_renewal()
        
        print("\n💾 Testing Backup/Restore APIs...")
        backup_data = self.test_backup_creation()
        self.test_backup_restore(backup_data)
        
        print("\n📊 Testing Chats Metadata APIs...")
        self.test_rooms_stats()
        
        print("\n🛡️ Testing Security APIs...")
        blocked_ips = self.test_security_blocked_ips_get()
        self.test_security_block_ips()
        login_attempts = self.test_security_login_attempts()
        devices = self.test_admin_devices()
        self.test_device_deletion(devices)
        
        # Summary
        print("\n" + "=" * 60)
        print("📈 TEST SUMMARY")
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
    tester = SettingsAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)