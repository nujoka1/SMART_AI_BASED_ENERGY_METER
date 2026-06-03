# Boot script for Smart Energy Monitor ESP32
# This runs automatically on system startup
import time
import machine
import network
import gc

print("\n" + "="*50)
print("Smart Energy Monitor - Booting...")
print("="*50)

# Initialize relay GPIO pins (active LOW: off=HIGH, on=LOW)
relay_pins = {1: 26, 2: 27, 3: 14, 4: 12}
relays = {}

try:
    for zone, pin in relay_pins.items():
        relays[zone] = machine.Pin(pin, machine.Pin.OUT)
        relays[zone].on()  # Start with relay OFF (HIGH)
        print(f"✓ Zone {zone} relay initialized (GPIO {pin})")
except Exception as e:
    print(f"✗ Relay init error: {e}")

# Initialize status LEDs
try:
    led_green = machine.Pin(32, machine.Pin.OUT)
    led_red = machine.Pin(33, machine.Pin.OUT)
    led_blue = machine.Pin(13, machine.Pin.OUT)
    
    # LED blink pattern = system starting
    for i in range(3):
        led_green.on()
        time.sleep(0.1)
        led_green.off()
        time.sleep(0.1)
    print("✓ LED indicators ready")
except Exception as e:
    print(f"✗ LED init error: {e}")

# Initialize UART2 for PZEM sensor
try:
    uart = machine.UART(2, baudrate=9600, tx=17, rx=16)
    uart.init(baudrate=9600, bits=8, parity=None, stop=1)
    print("✓ PZEM sensor UART initialized (GPIO 16/17)")
except Exception as e:
    print(f"✗ UART init error: {e}")

print("\nWiFi connecting to MTN WIFI...")
led_blue.on()

# Connect to WiFi
wlan = network.WLAN(network.STA_IF)
wlan.active(True)

if not wlan.isconnected():
    wlan.connect('MTN WIFI', '99999999')
    
    # Wait for connection
    timeout = 10
    while not wlan.isconnected() and timeout > 0:
        print(f"  Connecting... ({timeout}s remaining)")
        time.sleep(1)
        timeout -= 1

if wlan.isconnected():
    config = wlan.ifconfig()
    print(f"✓ WiFi connected! IP: {config[0]}")
    led_green.on()
    led_blue.off()
else:
    print("✗ WiFi connection failed")
    led_red.on()
    led_blue.off()

print("✓ System startup complete!")
print("="*50 + "\n")

# Free memory
gc.collect()
