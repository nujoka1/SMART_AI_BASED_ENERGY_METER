// ═══════════════════════════════════════════════════════════════
// TFT_USER_SETUP.h — User Configuration for TFT_eSPI Library
// Place this file in: Arduino/libraries/TFT_eSPI/User_Setups/
// Then uncomment line 29 in TFT_eSPI.h (User_Setup.h)
// ═══════════════════════════════════════════════════════════════

#define ILI9341_DRIVER       // ILI9341 display driver
#define TFT_WIDTH  320
#define TFT_HEIGHT 240

// ─────────────────────────────────────────────
//  SPI PINS — ESP32
// ─────────────────────────────────────────────
#define TFT_CS    5          // Chip select control pin
#define TFT_DC    23         // Data Command control pin
#define TFT_SDA   19         // MOSI (Data in) on GPIO19
#define TFT_SCL   18         // SCLK on GPIO18
#define TFT_RST   22         // Reset pin
#define TFT_MISO  25         // MISO (Data out) - optional

// ─────────────────────────────────────────────
//  SPI SETTINGS
// ─────────────────────────────────────────────
#define TFT_BACKLIGHT_ON HIGH
#define SPI_FREQUENCY  20000000    // 20 MHz SPI clock
#define SPI_READ_FREQUENCY  5000000
#define SPI_TOUCH_FREQUENCY  2500000

// ─────────────────────────────────────────────
//  FONT SETTINGS
// ─────────────────────────────────────────────
#define LOAD_GLCD   // Font 1 (default 5x7 pixel font — VGA compatible)
#define LOAD_FONT2  // Font 2 (small 16 pixel height font)
#define LOAD_FONT4  // Font 4 (small 26 pixel height font)
#define LOAD_FONT6  // Font 6 (small 48 pixel height font)
#define LOAD_FONT7  // Font 7 (7 segment 48 pixel height font)
#define LOAD_FONT8  // Font 8 (giant 7 segment 75 pixel height font)
#define LOAD_GFXFF  // FreeFonts

// ─────────────────────────────────────────────
//  FEATURE SETTINGS
// ─────────────────────────────────────────────
#define SMOOTH_FONT

// ─────────────────────────────────────────────
//  ORIENTATION (rotation)
// ─────────────────────────────────────────────
// 0 = 0 degrees (portrait), 1 = 90 degrees (landscape)
// 2 = 180 degrees (portrait), 3 = 270 degrees (landscape)
