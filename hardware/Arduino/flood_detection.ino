/*
 * AHON FloodWatch - Arduino Firmware (Memory-Optimized)
 * Fixed for SIM900/SIM800 GSM module stability & HTTP tunnel delivery.
 */

#include <SoftwareSerial.h>

// ----------------------
// Pins
// ----------------------
const int SENSOR_PIN = A0;
const int LED_GREEN  = 13;
const int LED_YELLOW = 12;
const int LED_RED    = 11;
const bool LED_ACTIVE_HIGH = true;

// ----------------------
// GSM/GPRS
// ----------------------
SoftwareSerial gsmSerial(7, 8); // RX, TX

// ----------------------
// Backend URL & Phone
// ----------------------
const char SERVER_URL[] = "http://aptitude-unpopular-demotion.ngrok-free.dev/api/water-level/";
const char RECIPIENT_PHONE[] = "+639077650549";

// ----------------------
// Thresholds (converted water level)
// ----------------------
const float THRESHOLD_WARNING_CM = 30.0;
const float THRESHOLD_DANGER_CM = 60.0;
const float MAX_CM = 100.0;

// ----------------------
// Timing
// ----------------------
const unsigned long READ_INTERVAL_MS = 5000;
const unsigned long SMS_COOLDOWN_MS  = 60000;
const unsigned long GPRS_RETRY_INTERVAL_MS = 30000;

unsigned long lastReadTime = 0;
unsigned long lastSmsTime = 0;
unsigned long lastGprsRetryTime = 0;
bool gprsReady = false;

float rawToCm(int rawValue) {
  rawValue = constrain(rawValue, 0, 1023);
  return (rawValue / 1023.0) * MAX_CM;
}

const char* determineStatusFromWaterLevel(float waterLevelCm) {
  if (waterLevelCm < THRESHOLD_WARNING_CM) {
    return "Normal";
  } else if (waterLevelCm < THRESHOLD_DANGER_CM) {
    return "Warning";
  } else {
    return "Danger";
  }
}

void setup() {
  Serial.begin(9600);
  gsmSerial.begin(9600);

  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_YELLOW, OUTPUT);
  pinMode(LED_RED, OUTPUT);

  writeLed(LED_GREEN, false);
  writeLed(LED_YELLOW, false);
  writeLed(LED_RED, false);

  testLeds();

  Serial.println(F("===================================="));
  Serial.println(F("AHON FloodWatch - Arduino Sensor"));
  Serial.println(F("===================================="));
  Serial.println(F("Status: <30cm Normal | 30-59.99cm Warning | >=60cm Danger"));

  delay(2000);
  initGSM();
  setupGPRS();
}

void loop() {
  unsigned long now = millis();

  // Retry GPRS configuration if connection failed earlier
  if (!gprsReady && (now - lastGprsRetryTime >= GPRS_RETRY_INTERVAL_MS)) {
    lastGprsRetryTime = now;
    setupGPRS();
  }

  if (lastReadTime == 0 || (now - lastReadTime >= READ_INTERVAL_MS)) {
    lastReadTime = now;

    int rawValue = analogRead(SENSOR_PIN);
    float waterLevelCm = rawToCm(rawValue);
    const char* status = determineStatusFromWaterLevel(waterLevelCm);

    Serial.print(F("RAW="));
    Serial.print(rawValue);
    Serial.print(F(" | CM="));
    Serial.print(waterLevelCm, 2);
    Serial.print(F(" | STATUS="));
    Serial.println(status);

    updateStatusLeds(waterLevelCm);

    // SMS Alert Logic
    if ((strcmp(status, "Warning") == 0 || strcmp(status, "Danger") == 0) &&
        (now - lastSmsTime >= SMS_COOLDOWN_MS)) {
      Serial.println(F("Sending SMS alert..."));
      String smsMessage = "BARANGAY TONSUYA FLOOD ";
      smsMessage += status;
      smsMessage += " - Water level: ";
      smsMessage += String(waterLevelCm, 2);
      smsMessage += " cm";
      
      if (sendSMS(smsMessage)) {
        lastSmsTime = now;
      }
      delay(2000);
    }

    // HTTP Payload Transmission
    sendHTTPData(rawValue, waterLevelCm, status);
  }

  delay(200);
}

void writeLed(int pin, bool on) {
  bool outputHigh = LED_ACTIVE_HIGH ? on : !on;
  digitalWrite(pin, outputHigh ? HIGH : LOW);
}

void updateStatusLeds(float waterLevelCm) {
  writeLed(LED_GREEN, waterLevelCm < THRESHOLD_WARNING_CM);
  writeLed(LED_YELLOW, waterLevelCm >= THRESHOLD_WARNING_CM && waterLevelCm < THRESHOLD_DANGER_CM);
  writeLed(LED_RED, waterLevelCm >= THRESHOLD_DANGER_CM);
}

void testLeds() {
  Serial.println(F("Testing status LEDs..."));
  writeLed(LED_GREEN, true); delay(200); writeLed(LED_GREEN, false);
  writeLed(LED_YELLOW, true); delay(200); writeLed(LED_YELLOW, false);
  writeLed(LED_RED, true); delay(200); writeLed(LED_RED, false);
}

void initGSM() {
  Serial.println(F("Initializing GSM..."));
  sendATCommand("AT", 1000);
  sendATCommand("ATE0", 1000);
  sendATCommand("AT+CMGF=1", 1000);
  Serial.println(F("GSM initialized."));
}

void setupGPRS() {
  Serial.println(F("Configuring GPRS..."));

  sendATCommand("AT+CSQ", 2000);
  sendATCommand("AT+CREG?", 2000);
  sendATCommand("AT+CGATT=1", 5000);

  sendATCommand("AT+SAPBR=3,1,\"Contype\",\"GPRS\"", 2000);
  sendATCommand("AT+SAPBR=3,1,\"APN\",\"internet\"", 2000);
  sendATCommand("AT+SAPBR=1,1", 5000);

  String ipRes = sendATCommand("AT+SAPBR=2,1", 3000);

  if (ipRes.indexOf("+SAPBR: 1,1") != -1) {
    gprsReady = true;
    Serial.println(F("GPRS is Ready!"));
  } else {
    gprsReady = false;
    Serial.println(F("GPRS not ready. Check SIM, signal, APN, or Power Supply."));
  }
}

void sendHTTPData(int rawValue, float waterLevelCm, const char* status) {
  if (!gprsReady) {
    Serial.println(F("Skipping HTTP upload because GPRS is not ready."));
    return;
  }

  char payload[160];
  char waterLevelText[10];
  dtostrf(waterLevelCm, 1, 2, waterLevelText);

  snprintf(payload, sizeof(payload),
    "{\"raw\":%d,\"water_level_cm\":%s,\"status\":\"%s\",\"sensor_status\":\"online\"}",
    rawValue, waterLevelText, status
  );

  Serial.print(F("Payload: "));
  Serial.println(payload);

  sendATCommand("AT+HTTPTERM", 1000);
  sendATCommand("AT+HTTPINIT", 2000);
  sendATCommand("AT+HTTPPARA=\"CID\",1", 2000);
  sendATCommand("AT+HTTPPARA=\"CONTENT\",\"application/json\"", 2000);
  
  sendATCommand("AT+HTTPPARA=\"USERDATA\",\"ngrok-skip-browser-warning: true\"", 2000);
  sendATCommand("AT+HTTPPARA=\"REDIR\",1", 2000);

  String urlCmd = "AT+HTTPPARA=\"URL\",\"";
  urlCmd += SERVER_URL;
  urlCmd += "\"";
  sendATCommand(urlCmd.c_str(), 2000);

  String dataCmd = "AT+HTTPDATA=";
  dataCmd += String(strlen(payload));
  dataCmd += ",10000";

  String dataRes = sendATCommand(dataCmd.c_str(), 3000);
  if (dataRes.indexOf("DOWNLOAD") != -1) {
    gsmSerial.print(payload);
    delay(1000);
    // Taasan ang timeout to 15 seconds for LocalTunnel response
    sendATCommand("AT+HTTPACTION=1", 15000);
    sendATCommand("AT+HTTPREAD", 3000);
  } else {
    Serial.println(F("Failed to prepare HTTPDATA buffer."));
  }

  sendATCommand("AT+HTTPTERM", 1000);
}

bool sendSMS(String message) {
  gsmSerial.print(F("AT+CMGS=\""));
  gsmSerial.print(RECIPIENT_PHONE);
  gsmSerial.println(F("\""));
  delay(1000);

  gsmSerial.print(message);
  gsmSerial.write(26); // Ctrl+Z to send
  delay(5000);

  Serial.println(F("SMS send triggered."));
  return true;
}

String sendATCommand(const char* command, int timeoutMs) {
  gsmSerial.println(command);
  String response = "";
  unsigned long start = millis();

  while (millis() - start < timeoutMs) {
    while (gsmSerial.available()) {
      char c = gsmSerial.read();
      response += c;
      Serial.write(c);
    }
  }
  Serial.println();
  return response;
}