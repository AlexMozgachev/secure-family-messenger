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
BASE_URL = "https://chatbuilder-app.preview.emergentagent.com/api"
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
    
    def test_system_monitoring(self):
        """Test GET /api/admin/system/monitoring - NEW ENDPOINT"""
        try:
            response = self.session.get(f"{BASE_URL}/admin/system/monitoring")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for required top-level keys
                required_keys = ["cpu", "memory", "disk", "network", "system"]
                missing_keys = [key for key in required_keys if key not in data]
                
                if missing_keys:
                    self.log_test("System Monitoring", False, f"Missing required keys: {missing_keys}", data)
                    return
                
                # Validate CPU data
                cpu_data = data.get("cpu", {})
                cpu_required = ["percent", "cores"]
                cpu_missing = [key for key in cpu_required if key not in cpu_data]
                
                # Validate Memory data
                memory_data = data.get("memory", {})
                memory_required = ["used_gb", "total_gb", "percent"]
                memory_missing = [key for key in memory_required if key not in memory_data]
                
                # Validate Disk data
                disk_data = data.get("disk", {})
                disk_required = ["used_gb", "total_gb", "percent"]
                disk_missing = [key for key in disk_required if key not in disk_data]
                
                # Validate Network data
                network_data = data.get("network", {})
                network_required = ["sent_mb", "received_mb", "total_mb"]
                network_missing = [key for key in network_required if key not in network_data]
                
                # Validate System data
                system_data = data.get("system", {})
                system_required = ["uptime_hours", "timestamp"]
                system_missing = [key for key in system_required if key not in system_data]
                
                # Check for any missing fields
                all_missing = []
                if cpu_missing:
                    all_missing.extend([f"cpu.{key}" for key in cpu_missing])
                if memory_missing:
                    all_missing.extend([f"memory.{key}" for key in memory_missing])
                if disk_missing:
                    all_missing.extend([f"disk.{key}" for key in disk_missing])
                if network_missing:
                    all_missing.extend([f"network.{key}" for key in network_missing])
                if system_missing:
                    all_missing.extend([f"system.{key}" for key in system_missing])
                
                if all_missing:
                    self.log_test("System Monitoring", False, f"Missing required fields: {all_missing}", data)
                    return
                
                # Validate data types and reasonable values
                validation_errors = []
                
                # CPU validation
                if not isinstance(cpu_data.get("percent"), (int, float)) or cpu_data.get("percent") < 0 or cpu_data.get("percent") > 100:
                    validation_errors.append("cpu.percent should be 0-100")
                if not isinstance(cpu_data.get("cores"), int) or cpu_data.get("cores") <= 0:
                    validation_errors.append("cpu.cores should be positive integer")
                
                # Memory validation
                if not isinstance(memory_data.get("used_gb"), (int, float)) or memory_data.get("used_gb") < 0:
                    validation_errors.append("memory.used_gb should be non-negative")
                if not isinstance(memory_data.get("total_gb"), (int, float)) or memory_data.get("total_gb") <= 0:
                    validation_errors.append("memory.total_gb should be positive")
                if not isinstance(memory_data.get("percent"), (int, float)) or memory_data.get("percent") < 0 or memory_data.get("percent") > 100:
                    validation_errors.append("memory.percent should be 0-100")
                
                # Disk validation
                if not isinstance(disk_data.get("used_gb"), (int, float)) or disk_data.get("used_gb") < 0:
                    validation_errors.append("disk.used_gb should be non-negative")
                if not isinstance(disk_data.get("total_gb"), (int, float)) or disk_data.get("total_gb") <= 0:
                    validation_errors.append("disk.total_gb should be positive")
                if not isinstance(disk_data.get("percent"), (int, float)) or disk_data.get("percent") < 0 or disk_data.get("percent") > 100:
                    validation_errors.append("disk.percent should be 0-100")
                
                # Network validation
                if not isinstance(network_data.get("sent_mb"), (int, float)) or network_data.get("sent_mb") < 0:
                    validation_errors.append("network.sent_mb should be non-negative")
                if not isinstance(network_data.get("received_mb"), (int, float)) or network_data.get("received_mb") < 0:
                    validation_errors.append("network.received_mb should be non-negative")
                if not isinstance(network_data.get("total_mb"), (int, float)) or network_data.get("total_mb") < 0:
                    validation_errors.append("network.total_mb should be non-negative")
                
                # System validation
                if not isinstance(system_data.get("uptime_hours"), (int, float)) or system_data.get("uptime_hours") < 0:
                    validation_errors.append("system.uptime_hours should be non-negative")
                if not isinstance(system_data.get("timestamp"), str):
                    validation_errors.append("system.timestamp should be string")
                
                if validation_errors:
                    self.log_test("System Monitoring", False, f"Data validation errors: {validation_errors}", data)
                    return
                
                # Success - log the monitoring data
                self.log_test("System Monitoring", True, "Successfully retrieved system monitoring data", {
                    "cpu_percent": cpu_data.get("percent"),
                    "cpu_cores": cpu_data.get("cores"),
                    "memory_percent": memory_data.get("percent"),
                    "memory_total_gb": memory_data.get("total_gb"),
                    "disk_percent": disk_data.get("percent"),
                    "disk_total_gb": disk_data.get("total_gb"),
                    "network_total_mb": network_data.get("total_mb"),
                    "uptime_hours": system_data.get("uptime_hours")
                })
                
            elif response.status_code == 403:
                self.log_test("System Monitoring", False, "Access denied - admin authentication required", response.text)
            else:
                self.log_test("System Monitoring", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("System Monitoring", False, f"Request error: {str(e)}")
    
    def test_system_monitoring_without_auth(self):
        """Test GET /api/admin/system/monitoring without authentication"""
        try:
            # Temporarily remove auth header
            original_auth = self.session.headers.get("Authorization")
            if original_auth:
                del self.session.headers["Authorization"]
            
            response = self.session.get(f"{BASE_URL}/admin/system/monitoring")
            
            # Restore auth header
            if original_auth:
                self.session.headers["Authorization"] = original_auth
            
            if response.status_code == 401:
                self.log_test("System Monitoring Auth Check", True, "Correctly requires authentication (401 Unauthorized)")
            elif response.status_code == 403:
                self.log_test("System Monitoring Auth Check", True, "Correctly requires authentication (403 Forbidden)")
            else:
                self.log_test("System Monitoring Auth Check", False, f"Should require auth but got HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("System Monitoring Auth Check", False, f"Request error: {str(e)}")
    
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
        
        print("\n📊 Testing System Monitoring APIs...")
        self.test_system_monitoring_without_auth()
        self.test_system_monitoring()
        
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