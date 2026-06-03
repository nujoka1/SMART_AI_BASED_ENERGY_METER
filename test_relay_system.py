#!/usr/bin/env python3
"""
Smart Energy Monitor - ESP32 Relay System Verification Script
Tests WiFi, Firebase, and relay functionality
"""

import serial
import time
import json
import sys

class ESP32Tester:
    def __init__(self, port='/dev/ttyACM0', baud=115200):
        self.port = port
        self.baud = baud
        self.conn = None
    
    def connect(self):
        try:
            self.conn = serial.Serial(self.port, self.baud, timeout=2)
            time.sleep(1)
            print(f"✓ Connected to {self.port} @ {self.baud} baud")
            return True
        except Exception as e:
            print(f"✗ Failed to connect: {e}")
            return False
    
    def send_cmd(self, cmd, wait=0.5):
        if not self.conn:
            return None
        self.conn.write((cmd + '\r\n').encode())
        time.sleep(wait)
        try:
            return self.conn.read(512).decode('utf-8', errors='ignore')
        except:
            return None
    
    def test_relays(self):
        print("\n" + "="*60)
        print("TEST 1: RELAY GPIO CONTROL")
        print("="*60)
        
        zones = {1: 26, 2: 27, 3: 14, 4: 12}
        
        for zone, pin in zones.items():
            cmd = f'm=__import__("machine");m.Pin({pin},m.Pin.OUT).off()'
            self.send_cmd(cmd)
            print(f"✓ Zone {zone} (GPIO {pin}) - ON (listen for click)")
            time.sleep(0.5)
            
            cmd = f'm=__import__("machine");m.Pin({pin},m.Pin.OUT).on()'
            self.send_cmd(cmd)
            print(f"  Zone {zone} - OFF")
            time.sleep(0.3)
        
        print("\nDid you hear 4 relay clicks above?")
    
    def test_wifi_import(self):
        print("\n" + "="*60)
        print("TEST 2: WIFI LIBRARY CHECK")
        print("="*60)
        
        result = self.send_cmd('import network; wlan = network.WLAN(network.STA_IF); print("WiFi OK")')
        if result and 'WiFi OK' in result:
            print("✓ WiFi module imported successfully")
        else:
            print("✗ WiFi module not available")
    
    def test_urequests_import(self):
        print("\n" + "="*60)
        print("TEST 3: FIREBASE LIBRARY CHECK")
        print("="*60)
        
        result = self.send_cmd('import urequests; print("urequests OK")')
        if result and 'OK' in result:
            print("✓ urequests module available (Firebase ready)")
        else:
            print("⚠ urequests may not be installed")
            print("  Note: It will be loaded when main.py runs")
    
    def test_uart(self):
        print("\n" + "="*60)
        print("TEST 4: UART2 SENSOR INTERFACE")
        print("="*60)
        
        result = self.send_cmd('u=__import__("machine").UART(2,9600,tx=17,rx=16); print("UART OK")')
        if result and 'OK' in result:
            print("✓ UART2 initialized for PZEM sensor")
            print("  TX: GPIO 17, RX: GPIO 16")
        else:
            print("⚠ UART initialization issue (may still work)")
    
    def test_led_indicators(self):
        print("\n" + "="*60)
        print("TEST 5: LED STATUS INDICATORS")
        print("="*60)
        
        colors = {'green': 32, 'red': 33, 'blue': 13}
        
        for color, pin in colors.items():
            cmd = f'__import__("machine").Pin({pin},__import__("machine").Pin.OUT).on()'
            self.send_cmd(cmd, 0.3)
            print(f"✓ {color.upper()} LED (GPIO {pin}) - ON")
            time.sleep(0.2)
            
            cmd = f'__import__("machine").Pin({pin},__import__("machine").Pin.OUT).off()'
            self.send_cmd(cmd, 0.3)
            print(f"  {color.upper()} LED - OFF")
    
    def check_file_system(self):
        print("\n" + "="*60)
        print("TEST 6: ESP32 FILE SYSTEM")
        print("="*60)
        
        result = self.send_cmd('import os; print(os.listdir("/"))', wait=1)
        if result:
            print("✓ Files on ESP32:")
            if 'boot.py' in result:
                print("  ✓ boot.py found")
            else:
                print("  ✗ boot.py NOT found")
            
            if 'main.py' in result:
                print("  ✓ main.py found")
            else:
                print("  ✗ main.py NOT found")
    
    def get_system_info(self):
        print("\n" + "="*60)
        print("SYSTEM INFORMATION")
        print("="*60)
        
        result = self.send_cmd('import sys; print(f"Python: {sys.version}")', wait=0.5)
        if result:
            print(result[:100])
        
        result = self.send_cmd('import machine; print(f"ESP32: {machine.unique_id().hex()}")', wait=0.5)
        if result:
            print(result[:100])
    
    def run_all_tests(self):
        print("\n" + "="*80)
        print(" SMART ENERGY MONITOR - ESP32 RELAY SYSTEM VERIFICATION")
        print("="*80)
        
        if not self.connect():
            print("\n✗ CANNOT PROCEED: ESP32 not accessible")
            return False
        
        self.test_relays()
        self.test_wifi_import()
        self.test_urequests_import()
        self.test_uart()
        self.test_led_indicators()
        self.check_file_system()
        self.get_system_info()
        
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        print("""
If most tests passed:
1. ✓ Reset ESP32 (Ctrl+D in REPL)
2. ✓ Check green LED (WiFi connected)
3. ✓ Open Firebase Console → /live
4. ✓ Verify sensor data updates every 5 seconds
5. ✓ Test relay control from web dashboard

If any test failed:
- Check wiring and GPIO pin assignments
- Verify USB cable connection
- Review error messages above
- Consult RELAY_SETUP_COMPLETE.md for troubleshooting
        """)
        
        self.conn.close()
        print("\n✅ Tests complete!")

if __name__ == '__main__':
    tester = ESP32Tester()
    tester.run_all_tests()
