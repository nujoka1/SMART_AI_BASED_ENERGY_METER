# Smart Energy Monitor - Relay Control & Sensor Integration
# Integrates with Firebase for remote relay control and data logging

import time
import machine
import network
import urequests
import json
import gc
from uhashlib import md5

# Configuration
FIREBASE_URL = "https://smart-energy-monitor-5b72b-default-rtdb.europe-west1.firebasedatabase.app"
FIREBASE_SECRET = "5d1073f7a8884d5345a44b2349800eab769a961d"

# Relay pins (active LOW: low=ON, high=OFF)
relay_pins = {
    1: 26,
    2: 27,
    3: 14,
    4: 12
}

# LED pins
led_pins = {
    'green': 32,
    'red': 33,
    'blue': 13
}

# Initialize pins
relays = {}
leds = {}

for zone, pin in relay_pins.items():
    relays[zone] = machine.Pin(pin, machine.Pin.OUT)
    relays[zone].on()  # Start OFF (HIGH)

for color, pin in led_pins.items():
    leds[color] = machine.Pin(pin, machine.Pin.OUT)
    leds[color].off()

# UART for PZEM sensor
uart = machine.UART(2, baudrate=9600, tx=17, rx=16)

# WiFi status indicator
def led_status(status):
    if status == 'connecting':
        leds['blue'].on()
        leds['green'].off()
    elif status == 'connected':
        leds['green'].on()
        leds['blue'].off()
    elif status == 'error':
        leds['red'].on()
        leds['blue'].off()
    else:
        leds['green'].off()
        leds['blue'].off()
        leds['red'].off()

# Relay control functions
def relay_on(zone):
    try:
        relays[zone].off()  # LOW = ON (active low logic)
        print(f"Zone {zone} ON")
        leds['green'].on()
    except Exception as e:
        print(f"Error turning on zone {zone}: {e}")
        leds['red'].on()

def relay_off(zone):
    try:
        relays[zone].on()  # HIGH = OFF (active low logic)
        print(f"Zone {zone} OFF")
        leds['green'].on()
    except Exception as e:
        print(f"Error turning off zone {zone}: {e}")
        leds['red'].on()

def relay_status(zone):
    return "on" if relays[zone].value() == 0 else "off"

# PZEM sensor reading
def read_pzem():
    try:
        # Request data from PZEM
        uart.write(b'\x00\x04\x00\x00\x00\x0C\x24')
        time.sleep(0.2)
        
        # Read response (25 bytes typical)
        response = uart.read(25)
        if response and len(response) >= 25:
            # Parse PZEM response
            data = {
                'voltage': (response[1] << 8 | response[2]) / 10.0,
                'current': (response[3] << 8 | response[4]) / 100.0,
                'power': (response[5] << 8 | response[6]) / 10.0,
                'energy': (response[7] << 8 | response[8]) / 1.0,
                'frequency': response[11] / 10.0,
                'pf': response[13] / 100.0,
            }
            return data
    except Exception as e:
        print(f"PZEM error: {e}")
    
    return None

# WiFi connection
def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    
    if not wlan.isconnected():
        print("Connecting to WiFi...")
        led_status('connecting')
        wlan.connect('MTN WIFI', '99999999')
        
        timeout = 15
        while not wlan.isconnected() and timeout > 0:
            print(f"  Waiting... ({timeout}s)")
            time.sleep(1)
            timeout -= 1
    
    if wlan.isconnected():
        config = wlan.ifconfig()
        print(f"WiFi connected! IP: {config[0]}")
        led_status('connected')
        return True
    else:
        print("WiFi connection failed!")
        led_status('error')
        return False

# Firebase operations
def firebase_put(path, data):
    try:
        url = f"{FIREBASE_URL}{path}.json?auth={FIREBASE_SECRET}"
        response = urequests.put(url, json=data, timeout=5)
        result = response.json() if response.status_code == 200 else None
        response.close()
        return result
    except Exception as e:
        print(f"Firebase PUT error: {e}")
        return None

def firebase_get(path):
    try:
        url = f"{FIREBASE_URL}{path}.json?auth={FIREBASE_SECRET}"
        response = urequests.get(url, timeout=5)
        result = response.json() if response.status_code == 200 else None
        response.close()
        return result
    except Exception as e:
        print(f"Firebase GET error: {e}")
        return None

# Main loop
def main():
    print("\nSmart Energy Monitor - Starting...")
    
    if not connect_wifi():
        print("Cannot proceed without WiFi")
        return
    
    # Send initial status
    status = {
        'zone1': relay_status(1),
        'zone2': relay_status(2),
        'zone3': relay_status(3),
        'zone4': relay_status(4),
        'timestamp': time.time(),
    }
    firebase_put('/live', status)
    
    print("Running relay & sensor controller...")
    
    while True:
        try:
            # Read relay commands from Firebase
            commands = firebase_get('/relay_commands')
            if commands:
                print(f"Received commands: {commands}")
                
                for zone in [1, 2, 3, 4]:
                    key = f'zone{zone}'
                    if key in commands:
                        if commands[key] == 'on':
                            relay_on(zone)
                        elif commands[key] == 'off':
                            relay_off(zone)
            
            # Read sensor data
            sensor_data = read_pzem()
            if sensor_data:
                # Prepare data for Firebase
                status = {
                    'voltage': sensor_data['voltage'],
                    'current': sensor_data['current'],
                    'power': sensor_data['power'],
                    'energy': sensor_data['energy'],
                    'frequency': sensor_data['frequency'],
                    'pf': sensor_data['pf'],
                    'zone1': relay_status(1),
                    'zone2': relay_status(2),
                    'zone3': relay_status(3),
                    'zone4': relay_status(4),
                    'timestamp': time.time(),
                }
                
                # Push to Firebase
                firebase_put('/live', status)
                print(f"Data pushed: V={status['voltage']}V, I={status['current']}A, P={status['power']}W")
            
            time.sleep(5)  # Poll every 5 seconds
            gc.collect()
            
        except Exception as e:
            print(f"Main loop error: {e}")
            time.sleep(2)

# Run the main loop
if __name__ == '__main__':
    main()
