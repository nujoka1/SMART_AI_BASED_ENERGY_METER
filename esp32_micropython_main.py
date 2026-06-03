"""
════════════════════════════════════════════════════════════════
 Smart Energy Monitor — MicroPython Firmware for ESP32
════════════════════════════════════════════════════════════════

Features:
  ✅ WiFi connection to Firebase Realtime Database
  ✅ PZEM-004T sensor reading (voltage, current, power, kWh)
  ✅ 4-Zone relay control (GPIO 26, 27, 14, 12)
  ✅ Real-time data push to Firebase
  ✅ Relay command polling
  ✅ Status LEDs (WiFi, anomaly, power)

Hardware:
  - ESP32-WROOM-32
  - PZEM-004T on UART2 (RX=GPIO16, TX=GPIO17)
  - 4-Channel relay on GPIO 26, 27, 14, 12
  - Status LEDs on GPIO 32, 33, 13

MicroPython Version: 1.20+
════════════════════════════════════════════════════════════════
"""

import network
import machine
import json
import time
import urequests
from machine import UART, Pin
import os

# ─────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────

WIFI_SSID = "MTN WIFI"
WIFI_PASS = "99999999"

FIREBASE_BASE = "https://smart-energy-monitor-5b72b-default-rtdb.europe-west1.firebasedatabase.app"
FIREBASE_SECRET = "5d1073f7a8884d5345a44b2349800eab769a961d"

# ─────────────────────────────────────────────
# PIN DEFINITIONS
# ─────────────────────────────────────────────

# PZEM-004T on UART2
PZEM_RX = 16
PZEM_TX = 17

# Relay pins (active LOW: HIGH=OFF, LOW=ON)
RELAY_Z1 = 26  # Zone 1: AC unit
RELAY_Z2 = 27  # Zone 2: Water heater
RELAY_Z3 = 14  # Zone 3: Sockets
RELAY_Z4 = 12  # Zone 4: Lighting

# Status LEDs
LED_GREEN = 32   # WiFi/Power OK
LED_RED = 33     # Anomaly/Fault
LED_BLUE = 13    # Activity

# ─────────────────────────────────────────────
# INITIALIZE GPIO PINS
# ─────────────────────────────────────────────

relay_pins = {
    'z1': Pin(RELAY_Z1, Pin.OUT),
    'z2': Pin(RELAY_Z2, Pin.OUT),
    'z3': Pin(RELAY_Z3, Pin.OUT),
    'z4': Pin(RELAY_Z4, Pin.OUT),
}

led_pins = {
    'green': Pin(LED_GREEN, Pin.OUT),
    'red': Pin(LED_RED, Pin.OUT),
    'blue': Pin(LED_BLUE, Pin.OUT),
}

# Set relays to OFF (HIGH=OFF for active-LOW)
for relay in relay_pins.values():
    relay.on()  # OFF

# ─────────────────────────────────────────────
# INITIALIZE UART FOR PZEM
# ─────────────────────────────────────────────

uart2 = UART(2, baudrate=9600, tx=PZEM_TX, rx=PZEM_RX)

# ─────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────

def led_on(color):
    """Turn on status LED"""
    if color in led_pins:
        led_pins[color].on()

def led_off(color):
    """Turn off status LED"""
    if color in led_pins:
        led_pins[color].off()

def relay_on(zone):
    """Turn ON relay (zone: 'z1', 'z2', 'z3', 'z4')"""
    if zone in relay_pins:
        relay_pins[zone].off()  # OFF pin = relay ON

def relay_off(zone):
    """Turn OFF relay"""
    if zone in relay_pins:
        relay_pins[zone].on()  # ON pin = relay OFF

def blink_led(color, times=1, delay_ms=200):
    """Blink LED"""
    for _ in range(times):
        led_on(color)
        time.sleep(delay_ms / 1000)
        led_off(color)
        time.sleep(delay_ms / 1000)

# ─────────────────────────────────────────────
# WIFI & FIREBASE
# ─────────────────────────────────────────────

def connect_wifi():
    """Connect to WiFi"""
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    
    if not wlan.isconnected():
        print(f"Connecting to {WIFI_SSID}...")
        wlan.connect(WIFI_SSID, WIFI_PASS)
        
        for _ in range(20):
            if wlan.isconnected():
                break
            time.sleep(0.5)
    
    if wlan.isconnected():
        print(f"WiFi connected: {wlan.ifconfig()[0]}")
        led_off('red')
        led_on('green')
        return True
    else:
        print("WiFi connection failed!")
        led_on('red')
        return False

def firebase_put(path, data):
    """Write data to Firebase"""
    url = f"{FIREBASE_BASE}{path}.json?auth={FIREBASE_SECRET}"
    try:
        headers = {'Content-Type': 'application/json'}
        response = urequests.put(url, data=json.dumps(data), headers=headers, timeout=5)
        blink_led('blue', 1, 100)
        return response.status_code == 200
    except Exception as e:
        print(f"Firebase PUT error: {e}")
        return False

def firebase_get(path):
    """Read data from Firebase"""
    url = f"{FIREBASE_BASE}{path}.json?auth={FIREBASE_SECRET}"
    try:
        response = urequests.get(url, timeout=5)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"Firebase GET error: {e}")
    return None

# ─────────────────────────────────────────────
# PZEM SENSOR READING
# ─────────────────────────────────────────────

def read_pzem():
    """Read PZEM-004T sensor data
    
    Returns: dict with voltage, current, power, energy, pf, frequency
    """
    # Command to read all registers (0x3F = all)
    cmd = bytes([0xF8, 0x04, 0x00, 0x00, 0x00, 0x00, 0x10, 0xE0])
    
    uart2.write(cmd)
    time.sleep(0.1)
    
    try:
        response = uart2.read(25)
        if response and len(response) >= 25:
            # Parse PZEM response
            voltage = (response[1] << 8 | response[2]) / 10.0
            current = (response[3] << 8 | response[4]) / 100.0
            power = (response[5] << 8 | response[6]) * 10.0
            energy = (response[9] << 24 | response[10] << 16 | response[11] << 8 | response[12]) / 100.0
            pf = response[13] / 100.0
            freq = response[14] / 10.0
            
            return {
                'v': voltage,      # Voltage in V
                'i': current,      # Current in A
                'w': power,        # Power in W
                'kwh': energy,     # Energy in kWh
                'pf': pf,          # Power factor
                'hz': freq,        # Frequency in Hz
                'ts': int(time.time() * 1000)  # Timestamp
            }
    except Exception as e:
        print(f"PZEM read error: {e}")
    
    return None

# ─────────────────────────────────────────────
# RELAY & COMMAND POLLING
# ─────────────────────────────────────────────

relay_state = {'z1': False, 'z2': False, 'z3': False, 'z4': False}

def poll_relay_commands():
    """Poll Firebase for relay commands"""
    global relay_state
    
    data = firebase_get('/relay_commands')
    if data:
        for zone in ['z1', 'z2', 'z3', 'z4']:
            if zone in data:
                new_state = data[zone]
                if new_state != relay_state[zone]:
                    relay_state[zone] = new_state
                    if new_state:
                        relay_on(zone)
                        print(f"✓ Relay {zone} ON")
                    else:
                        relay_off(zone)
                        print(f"✓ Relay {zone} OFF")

# ─────────────────────────────────────────────
# MAIN LOOP
# ─────────────────────────────────────────────

def main():
    """Main program loop"""
    print("Starting Smart Energy Monitor (MicroPython)...")
    
    # Connect to WiFi
    if not connect_wifi():
        print("Failed to connect WiFi. Retrying...")
        time.sleep(5)
        return
    
    print("Initialization complete. Starting data loop...")
    
    last_push_time = 0
    push_interval = 5  # Push every 5 seconds
    
    while True:
        try:
            # Read sensor
            sensor_data = read_pzem()
            if sensor_data:
                print(f"PZEM: {sensor_data['v']:.1f}V, {sensor_data['i']:.2f}A, {sensor_data['w']:.0f}W")
                
                # Push to Firebase every 5 seconds
                current_time = time.time()
                if current_time - last_push_time >= push_interval:
                    firebase_put('/live', sensor_data)
                    last_push_time = current_time
            
            # Poll relay commands
            poll_relay_commands()
            
            time.sleep(2)  # Read sensor every 2 seconds
            
        except KeyboardInterrupt:
            print("Stopped by user")
            break
        except Exception as e:
            print(f"Error in main loop: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()
