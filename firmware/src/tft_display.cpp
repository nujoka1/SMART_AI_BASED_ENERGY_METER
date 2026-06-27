#include <Arduino.h>
#include <math.h>
#include <TFT_eSPI.h>

#include "pzem_reader.h"
#include "energy_analyzer.h"
#include "firebase_client.h"
#include "tft_display.h"
#include "config.h"

static TFT_eSPI tft = TFT_eSPI();
static bool displayReady = false;

static const unsigned long PAGE_ROTATE_MS = 6000;
static unsigned long lastPageSwitch = 0;
static uint8_t currentPage = 0;
static const uint8_t PAGE_COUNT = 8;

static const int TREND_SIZE = 60;
static float powerTrend[TREND_SIZE];
static float voltageTrend[TREND_SIZE];
static float currentTrend[TREND_SIZE];
static int trendIndex = 0;
static bool trendFilled = false;

static AiPrediction cachedAi;
static ConsumptionSummary cachedDaily;
static ConsumptionSummary cachedWeekly;
static ConsumptionSummary cachedMonthly;
static ConsumptionSummary cachedYearly;

static uint16_t colorForStatus(const String& status) {
  if (status == "ok") return TFT_GREEN;
  if (status == "warning") return TFT_ORANGE;
  if (status == "critical") return TFT_RED;
  if (status == "sensor_error") return TFT_RED;
  return TFT_WHITE;
}

static uint16_t colorForRisk(const String& risk) {
  if (risk == "low") return TFT_GREEN;
  if (risk == "medium") return TFT_ORANGE;
  if (risk == "high") return TFT_RED;
  return TFT_WHITE;
}

static void updateTrendBuffer(const EnergyReading& reading) {
  if (!reading.valid) {
    return;
  }

  powerTrend[trendIndex] = reading.power_w;
  voltageTrend[trendIndex] = reading.voltage_v;
  currentTrend[trendIndex] = reading.current_a;

  trendIndex++;

  if (trendIndex >= TREND_SIZE) {
    trendIndex = 0;
    trendFilled = true;
  }
}

static void rotatePageIfNeeded() {
  unsigned long now = millis();

  if (now - lastPageSwitch >= PAGE_ROTATE_MS) {
    lastPageSwitch = now;
    currentPage = (currentPage + 1) % PAGE_COUNT;
  }
}

static void drawHeader(const String& title, bool wifiConnected) {
  tft.fillScreen(TFT_BLACK);

  tft.setTextColor(TFT_CYAN, TFT_BLACK);
  tft.setTextSize(2);
  tft.drawString(title, 10, 8);

  tft.setTextSize(1);
  tft.setTextColor(wifiConnected ? TFT_GREEN : TFT_RED, TFT_BLACK);
  tft.drawString(wifiConnected ? "ONLINE" : "OFFLINE", 398, 12);

  tft.drawFastHLine(10, 34, 460, TFT_DARKGREY);
}

static void drawFooter(uint8_t pageNumber) {
  tft.setTextSize(1);
  tft.setTextColor(TFT_DARKGREY, TFT_BLACK);

  String footer = "Page ";
  footer += String(pageNumber + 1);
  footer += "/";
  footer += String(PAGE_COUNT);
  footer += "  FW ";
  footer += FIRMWARE_VERSION;

  tft.drawString(footer, 10, 300);
}

static void drawMetricBox(
  int x,
  int y,
  int w,
  int h,
  const String& label,
  const String& value,
  uint16_t valueColor
) {
  tft.drawRoundRect(x, y, w, h, 8, TFT_DARKGREY);

  tft.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  tft.setTextSize(1);
  tft.drawString(label, x + 10, y + 8);

  tft.setTextColor(valueColor, TFT_BLACK);
  tft.setTextSize(2);
  tft.drawString(value, x + 10, y + 32);
}

static float readTrendValue(const float* buffer, int visibleIndex) {
  int count = trendFilled ? TREND_SIZE : trendIndex;

  if (count <= 0) {
    return 0.0;
  }

  int start = trendFilled ? trendIndex : 0;
  int idx = (start + visibleIndex) % TREND_SIZE;
  return buffer[idx];
}

static void drawTrendGraph(
  const String& title,
  const float* buffer,
  float minY,
  float maxY,
  const String& unit,
  uint16_t color,
  bool wifiConnected
) {
  drawHeader(title, wifiConnected);

  int graphX = 30;
  int graphY = 65;
  int graphW = 420;
  int graphH = 175;

  tft.drawRect(graphX, graphY, graphW, graphH, TFT_DARKGREY);

  tft.setTextSize(1);
  tft.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  tft.drawString(String(maxY, 1) + unit, graphX, graphY - 18);
  tft.drawString(String(minY, 1) + unit, graphX, graphY + graphH + 6);

  for (int i = 1; i < 4; i++) {
    int y = graphY + (graphH * i / 4);
    tft.drawFastHLine(graphX, y, graphW, TFT_DARKGREY);
  }

  int count = trendFilled ? TREND_SIZE : trendIndex;

  if (count < 2) {
    tft.setTextColor(TFT_YELLOW, TFT_BLACK);
    tft.setTextSize(2);
    tft.drawString("Collecting trend data...", 80, 145);
    drawFooter(currentPage);
    return;
  }

  float range = maxY - minY;

  if (range <= 0.01) {
    range = 1.0;
  }

  int previousX = graphX;
  int previousY = graphY + graphH;

  for (int i = 0; i < count; i++) {
    float value = readTrendValue(buffer, i);
    value = constrain(value, minY, maxY);

    int x = graphX + map(i, 0, count - 1, 0, graphW - 1);
    int y = graphY + graphH - (int)(((value - minY) / range) * graphH);

    if (i > 0) {
      tft.drawLine(previousX, previousY, x, y, color);
    }

    previousX = x;
    previousY = y;
  }

  float latest = readTrendValue(buffer, count - 1);

  tft.setTextColor(color, TFT_BLACK);
  tft.setTextSize(2);
  tft.drawString("Latest: " + String(latest, 2) + " " + unit, 30, 258);

  drawFooter(currentPage);
}

static void drawOverviewPage(
  const EnergyReading& reading,
  const EnergyStatus& status,
  bool wifiConnected,
  const String& ipAddress
) {
  drawHeader("LIVE METER OVERVIEW", wifiConnected);

  if (!reading.valid) {
    tft.setTextColor(TFT_RED, TFT_BLACK);
    tft.setTextSize(3);
    tft.drawString("PZEM ERROR", 30, 100);

    tft.setTextColor(TFT_WHITE, TFT_BLACK);
    tft.setTextSize(2);
    tft.drawString("Check RX16 / TX17", 30, 155);
    tft.drawString("Check sensor power", 30, 190);

    drawFooter(currentPage);
    return;
  }

  drawMetricBox(10, 50, 145, 68, "Voltage", String(reading.voltage_v, 1) + " V", TFT_GREEN);
  drawMetricBox(167, 50, 145, 68, "Current", String(reading.current_a, 3) + " A", TFT_YELLOW);
  drawMetricBox(324, 50, 145, 68, "Power", String(reading.power_w, 1) + " W", TFT_ORANGE);

  drawMetricBox(10, 132, 145, 68, "Energy", String(reading.energy_kwh, 3) + " kWh", TFT_CYAN);
  drawMetricBox(167, 132, 145, 68, "Frequency", String(reading.frequency_hz, 1) + " Hz", TFT_WHITE);
  drawMetricBox(324, 132, 145, 68, "Power Factor", String(reading.power_factor, 2), TFT_MAGENTA);

  uint16_t statusColor = colorForStatus(status.status);
  tft.drawRoundRect(10, 215, 459, 52, 8, statusColor);

  tft.setTextSize(2);
  tft.setTextColor(statusColor, TFT_BLACK);
  tft.drawString("STATUS: " + status.status, 22, 228);

  tft.setTextSize(1);
  tft.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  tft.drawString("Quality: " + status.power_quality, 250, 225);
  tft.drawString(status.message, 250, 242);

  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.drawString("IP: " + ipAddress, 10, 282);

  drawFooter(currentPage);
}

static void drawWavePage(const EnergyReading& reading, bool wifiConnected) {
  drawHeader("AC WAVE VISUALIZATION", wifiConnected);

  int baseY = 155;
  int amplitude = 62;
  int startX = 20;
  int width = 440;

  tft.drawFastHLine(startX, baseY, width, TFT_DARKGREY);

  for (int x = 0; x < width - 1; x++) {
    float phase1 = (float)x / 38.0;
    float phase2 = (float)(x + 1) / 38.0;

    int y1 = baseY + (int)(sin(phase1) * amplitude);
    int y2 = baseY + (int)(sin(phase2) * amplitude);

    tft.drawLine(startX + x, y1, startX + x + 1, y2, TFT_CYAN);
  }

  tft.setTextSize(2);
  tft.setTextColor(TFT_GREEN, TFT_BLACK);
  tft.drawString("Vrms: " + String(reading.voltage_v, 1) + " V", 35, 55);

  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.drawString("Freq: " + String(reading.frequency_hz, 1) + " Hz", 260, 55);

  tft.setTextColor(TFT_MAGENTA, TFT_BLACK);
  tft.drawString("PF: " + String(reading.power_factor, 2), 35, 255);

  tft.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  tft.setTextSize(1);
  tft.drawString("Visual only. PZEM provides RMS readings.", 35, 282);

  drawFooter(currentPage);
}

static void drawQualityPage(
  const EnergyReading& reading,
  const EnergyStatus& status,
  bool wifiConnected,
  const String& ipAddress
) {
  drawHeader("QUALITY & DEVICE HEALTH", wifiConnected);

  uint16_t statusColor = colorForStatus(status.status);

  tft.setTextSize(2);
  tft.setTextColor(statusColor, TFT_BLACK);
  tft.drawString("Risk: " + status.status, 25, 58);

  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.drawString("Quality: " + status.power_quality, 25, 95);

  tft.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  tft.setTextSize(1);
  tft.drawString("Message:", 25, 135);

  tft.setTextColor(TFT_YELLOW, TFT_BLACK);
  tft.setTextSize(2);
  tft.drawString(status.message, 25, 158);

  tft.setTextColor(TFT_GREEN, TFT_BLACK);
  tft.setTextSize(1);
  tft.drawString("IP: " + ipAddress, 25, 225);
  tft.drawString("Free heap: " + String(ESP.getFreeHeap()), 25, 245);
  tft.drawString("Uptime: " + String(millis() / 1000) + " s", 25, 265);

  drawFooter(currentPage);
}

static void drawAiPage(bool wifiConnected) {
  drawHeader("AI RECOMMENDATION", wifiConnected);

  if (!cachedAi.valid) {
    tft.setTextColor(TFT_YELLOW, TFT_BLACK);
    tft.setTextSize(2);
    tft.drawString("Waiting for AI data...", 45, 120);
    drawFooter(currentPage);
    return;
  }

  uint16_t riskColor = colorForRisk(cachedAi.risk_level);

  tft.setTextSize(2);
  tft.setTextColor(riskColor, TFT_BLACK);
  tft.drawString("Risk: " + cachedAi.risk_level, 25, 55);

  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.drawString("Score: " + String(cachedAi.anomaly_score, 3), 260, 55);

  tft.setTextColor(TFT_CYAN, TFT_BLACK);
  tft.drawString("Event: " + cachedAi.primary_type, 25, 95);

  tft.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  tft.setTextSize(1);
  tft.drawString("Recommendation:", 25, 135);

  tft.setTextColor(TFT_YELLOW, TFT_BLACK);
  tft.setTextSize(2);

  String rec = cachedAi.recommendation;

  if (rec.length() > 34) {
    tft.drawString(rec.substring(0, 34), 25, 160);
    tft.drawString(rec.substring(34, min((int)rec.length(), 68)), 25, 185);
    if (rec.length() > 68) {
      tft.drawString(rec.substring(68, min((int)rec.length(), 102)), 25, 210);
    }
  } else {
    tft.drawString(rec, 25, 160);
  }

  tft.setTextSize(1);
  tft.setTextColor(TFT_GREEN, TFT_BLACK);
  tft.drawString("AI source: Firebase / ai-engine", 25, 270);

  drawFooter(currentPage);
}

static void drawSummaryPage(bool wifiConnected) {
  drawHeader("CONSUMPTION SUMMARY", wifiConnected);

  if (!cachedDaily.valid && !cachedWeekly.valid && !cachedMonthly.valid) {
    tft.setTextColor(TFT_YELLOW, TFT_BLACK);
    tft.setTextSize(2);
    tft.drawString("Waiting for summary...", 55, 125);
    drawFooter(currentPage);
    return;
  }

  drawMetricBox(10, 55, 145, 68, "Today", String(cachedDaily.kwh_used, 3) + " kWh", TFT_GREEN);
  drawMetricBox(167, 55, 145, 68, "This Week", String(cachedWeekly.kwh_used, 3) + " kWh", TFT_CYAN);
  drawMetricBox(324, 55, 145, 68, "This Month", String(cachedMonthly.kwh_used, 3) + " kWh", TFT_ORANGE);

  drawMetricBox(10, 145, 145, 68, "Avg Power", String(cachedDaily.average_power_w, 1) + " W", TFT_WHITE);
  drawMetricBox(167, 145, 145, 68, "Peak Power", String(cachedDaily.peak_power_w, 1) + " W", TFT_YELLOW);
  drawMetricBox(324, 145, 145, 68, "Avg Voltage", String(cachedDaily.average_voltage_v, 1) + " V", TFT_MAGENTA);

  tft.setTextSize(1);
  tft.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  tft.drawString("Samples today: " + String(cachedDaily.sample_count), 15, 250);
  tft.drawString("Samples week: " + String(cachedWeekly.sample_count), 180, 250);
  tft.drawString("Samples month: " + String(cachedMonthly.sample_count), 330, 250);

  drawFooter(currentPage);
}

static void drawPrepaidPage(bool wifiConnected) {
  drawHeader("PREPAID & FORECAST", wifiConnected);

  if (!cachedAi.valid) {
    tft.setTextColor(TFT_YELLOW, TFT_BLACK);
    tft.setTextSize(2);
    tft.drawString("Waiting for forecast...", 55, 125);
    drawFooter(currentPage);
    return;
  }

  drawMetricBox(10, 55, 220, 72, "Remaining Units", String(cachedAi.remaining_prepaid_units_kwh, 2) + " kWh", TFT_GREEN);
  drawMetricBox(250, 55, 220, 72, "Days Remaining", String(cachedAi.estimated_days_remaining, 1) + " days", TFT_CYAN);

  drawMetricBox(10, 145, 145, 68, "Daily", String(cachedAi.forecast_daily_kwh, 3) + " kWh", TFT_YELLOW);
  drawMetricBox(167, 145, 145, 68, "Monthly", String(cachedAi.forecast_monthly_kwh, 2) + " kWh", TFT_ORANGE);
  drawMetricBox(324, 145, 145, 68, "Yearly", String(cachedAi.forecast_yearly_kwh, 1) + " kWh", TFT_MAGENTA);

  tft.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  tft.setTextSize(1);
  tft.drawString("Forecast is based on learned average power from history.", 15, 255);

  drawFooter(currentPage);
}

void initTftDisplay() {
  if (displayReady) {
    return;
  }

  tft.init();
  tft.setRotation(1);
  tft.setSwapBytes(true);
  tft.setTextWrap(false);
  tft.fillScreen(TFT_BLACK);

  for (int i = 0; i < TREND_SIZE; i++) {
    powerTrend[i] = 0.0;
    voltageTrend[i] = 0.0;
    currentTrend[i] = 0.0;
  }

  displayReady = true;
}

void showBootScreen() {
  if (!displayReady) {
    initTftDisplay();
  }

  tft.fillScreen(TFT_BLACK);

  tft.setTextColor(TFT_CYAN, TFT_BLACK);
  tft.setTextSize(3);
  tft.drawString("SMART AI", 35, 55);
  tft.drawString("ENERGY METER", 35, 95);

  tft.setTextSize(2);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.drawString("PZEM | TFT | WIFI | FIREBASE", 35, 155);

  tft.setTextColor(TFT_GREEN, TFT_BLACK);
  tft.drawString("Initializing...", 35, 205);
}

void updateTftAiPrediction(const AiPrediction& prediction) {
  cachedAi = prediction;
}

void updateTftSummaries(
  const ConsumptionSummary& daily,
  const ConsumptionSummary& weekly,
  const ConsumptionSummary& monthly,
  const ConsumptionSummary& yearly
) {
  cachedDaily = daily;
  cachedWeekly = weekly;
  cachedMonthly = monthly;
  cachedYearly = yearly;
}

void showEnergyScreen(
  const EnergyReading& reading,
  const EnergyStatus& status,
  bool wifiConnected,
  const String& ipAddress
) {
  if (!displayReady) {
    initTftDisplay();
  }

  updateTrendBuffer(reading);
  rotatePageIfNeeded();

  if (currentPage == 0) {
    drawOverviewPage(reading, status, wifiConnected, ipAddress);
  } else if (currentPage == 1) {
    float maxPower = reading.power_w + 30.0;
    if (maxPower < 100.0) {
      maxPower = 100.0;
    }
    drawTrendGraph("POWER TREND", powerTrend, 0.0, maxPower, "W", TFT_ORANGE, wifiConnected);
  } else if (currentPage == 2) {
    drawTrendGraph("VOLTAGE TREND", voltageTrend, 180.0, 260.0, "V", TFT_GREEN, wifiConnected);
  } else if (currentPage == 3) {
    drawWavePage(reading, wifiConnected);
  } else if (currentPage == 4) {
    drawQualityPage(reading, status, wifiConnected, ipAddress);
  } else if (currentPage == 5) {
    drawAiPage(wifiConnected);
  } else if (currentPage == 6) {
    drawSummaryPage(wifiConnected);
  } else {
    drawPrepaidPage(wifiConnected);
  }
}
