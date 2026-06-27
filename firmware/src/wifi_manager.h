#ifndef SMART_ENERGY_WIFI_MANAGER_H
#define SMART_ENERGY_WIFI_MANAGER_H

#include <Arduino.h>

void initWifiManager();
void updateWifiManager();

bool isWifiConnected();

String getWifiIp();
int getWifiRssi();

#endif
