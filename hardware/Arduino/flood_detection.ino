/*
 * AHON FloodWatch - Arduino Firmware
 * Corrected for real-time water level updates and Django payload compatibility.
 */

#include <SoftwareSerial.h>

// ----------------------
// Pins
// ----------------------
const int SENSOR_PIN = A0;
const int LED_GREEN  = 13;
const int LED_YELLOW = 12;
const int LED_RED    = 11;

// ----------------------
// GSM/GPRS
// ----------------------
SoftwareSerial gsmSerial(7, 8);

// ----------------------
// Backend URL
// Use your deployed Render backend URL with the actual API route.
// ----------------------
const String SERVER_URL = "https://ahon-floodwatch-backend.onrender.com/api/water-level/";
String RECIPIENT_PHONE = "+639077650549";

// ----------------------
// Thresholds (RAW ADC values)
// These must match Django backend validation.
// ----------------------
const int THRESHOLD_WARNING = 300;
const int THRESHOLD_DANGER = 550;
const float MAX_CM = 100.0;

// ----------------------
// Timing
// ----------------------
const unsigned long READ_INTERVAL_MS = 5000;
const unsigned long SMS_COOLDOWN_MS = 60000;
const unsigned long HTTP_DELAY_MS = 2000;

unsigned long lastReadTime = 0;
unsigned long lastUploadTime = 0;
unsigned long lastSmsTime = 0;

String currentStatus = "Normal";

float rawToCm(int rawValue) {
  rawValue = constrain(rawValue, 0, 1023);
  return (rawValue / 1023.0) * MAX_CM;
}

String determineStatusFromRaw(int rawValue) {
  if (rawValue < THRESHOLD_WARNING) {
    return "Normal";
  } else if (rawValue < THRESHOLD_DANGER) {
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

  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_YELLOW, LOW);
  digitalWrite(LED_RED, LOW);

  Serial.println("====================================");
  Serial.println("AHON FloodWatch - Arduino Sensor");
  Serial.println("====================================");

  delay(2000);
  initGSM();
  setupGPRS();
}

void loop() {
  unsigned long now = millis();

  if (now - lastReadTime >= READ_INTERVAL_MS) {
    lastReadTime = now;

    int rawValue = analogRead(SENSOR_PIN);
    float waterLevelCm = rawToCm(rawValue);
    String status = determineStatusFromRaw(rawValue);

    currentStatus = status;

    Serial.print("RAW=");
    Serial.print(rawValue);
    Serial.print(" | CM=");
    Serial.print(waterLevelCm, 2);
    Serial.print(" | STATUS=");
    Serial.println(status);

    if (rawValue < THRESHOLD_WARNING) {
      digitalWrite(LED_GREEN, HIGH);
      digitalWrite(LED_YELLOW, LOW);
      digitalWrite(LED_RED, LOW);
    } else if (rawValue < THRESHOLD_DANGER) {
      digitalWrite(LED_GREEN, LOW);
      digitalWrite(LED_YELLOW, HIGH);
      digitalWrite(LED_RED, LOW);
    } else {
      digitalWrite(LED_GREEN, LOW);
      digitalWrite(LED_YELLOW, LOW);
      digitalWrite(LED_RED, HIGH);
    }

    if ((status == "Warning" || status == "Danger") &&
        (now - lastSmsTime >= SMS_COOLDOWN_MS)) {
      Serial.println("Sending SMS alert...");
      sendSMS("BARANGAY TONSUYA FLOOD " + status + " - Water level: " + String(waterLevelCm, 2) + " cm");
      lastSmsTime = now;
      delay(HTTP_DELAY_MS);
    }

    if (now - lastUploadTime >= READ_INTERVAL_MS) {
      lastUploadTime = now;
      sendHTTPData(rawValue, waterLevelCm, status);
    }
  }

  delay(200);
}

void initGSM() {
  Serial.println("Initializing GSM...");

  sendAT("AT", 1000);
  sendAT("ATE0", 1000);
  sendAT("AT+CMGF=1", 1000);

  Serial.println("GSM ready");
}

void setupGPRS() {
  Serial.println("Configuring GPRS...");

  sendAT("AT+CGATT=1", 2000);
  sendAT("AT+SAPBR=3,1,\"Contype\",\"GPRS\"", 2000);
  sendAT("AT+SAPBR=3,1,\"APN\",\"internet\"", 2000);
  sendAT("AT+SAPBR=3,1,\"USER\",\"\"", 2000);
  sendAT("AT+SAPBR=3,1,\"PWD\",\"\"", 2000);
  sendAT("AT+SAPBR=1,1", 5000);
  sendAT("AT+SAPBR=2,1", 5000);

  Serial.println("GPRS ready");
}

String extractHttpStatusCode(String response) {
  int startIndex = response.indexOf("+HTTPACTION:");
  if (startIndex == -1) {
    return "";
  }

  int codeStart = response.indexOf(',', startIndex);
  if (codeStart == -1) {
    return "";
  }

  int codeEnd = response.indexOf(',', codeStart + 1);
  if (codeEnd == -1) {
    codeEnd = response.indexOf('\r', codeStart + 1);
  }

  if (codeEnd == -1) {
    return "";
  }

  String code = response.substring(codeStart + 1, codeEnd);
  code.trim();
  return code;
}

String sendATAndRead(String command, int timeoutMs) {
  gsmSerial.println(command);
  String response = "";
  unsigned long startTime = millis();

  while (millis() - startTime < timeoutMs) {
    while (gsmSerial.available()) {
      char c = gsmSerial.read();
      response += c;
      Serial.write(c);
    }

    if (response.indexOf("+HTTPACTION:") != -1 ||
        response.indexOf("OK") != -1 ||
        response.indexOf("ERROR") != -1) {
      break;
    }
  }

  return response;
}

void sendHTTPData(int rawValue, float waterLevelCm, String status) {
  String payload = "{";
  payload += "\"raw\":" + String(rawValue) + ",";
  payload += "\"water_level_cm\":" + String(waterLevelCm, 2) + ",";
  payload += "\"status\":\"" + status + "\",";
  payload += "\"sensor_status\":\"online\",";
  payload += "\"gsm_status\":\"connected\"";
  payload += "}";

  int payloadLength = payload.length();

  Serial.println("Sending HTTP payload...");
  Serial.println(payload);

  sendATAndRead("AT+HTTPTERM", 1000);
  sendATAndRead("AT+HTTPINIT", 2000);
  sendATAndRead("AT+HTTPPARA=\"CID\",1", 2000);
  sendATAndRead("AT+HTTPPARA=\"CONTENT\",\"application/json\"", 2000);
  sendATAndRead("AT+HTTPPARA=\"REDIR\",1", 2000);
  sendATAndRead("AT+HTTPPARA=\"URL\",\"" + SERVER_URL + "\"", 3000);

  Serial.print("Payload length: ");
  Serial.println(payloadLength);

  String prepareResponse = sendATAndRead("AT+HTTPDATA=" + String(payloadLength) + ",10000", 5000);
  if (prepareResponse.indexOf("DOWNLOAD") == -1 && prepareResponse.indexOf("OK") == -1) {
    Serial.println("HTTPDATA not ready. Modem may not be connected to the network.");
    sendATAndRead("AT+HTTPTERM", 1000);
    return;
  }

  gsmSerial.println(payload);
  delay(1500);

  String httpResponse = sendATAndRead("AT+HTTPACTION=1", 15000);
  String statusCode = extractHttpStatusCode(httpResponse);

  if (statusCode == "200" || statusCode == "201") {
    Serial.println("HTTP upload successful");
  } else {
    Serial.println("HTTP upload failed. No successful modem response.");
    Serial.print("HTTP Response: ");
    Serial.println(httpResponse);
    Serial.print("Parsed status code: ");
    Serial.println(statusCode);
    Serial.println("Expected: +HTTPACTION: 1,200,0 or +HTTPACTION: 1,201,0");
    Serial.println("Check SIM data connection, APN, and public backend reachability.");
  }

  sendATAndRead("AT+HTTPTERM", 1000);
}

void sendSMS(String messageText) {
  gsmSerial.print("AT+CMGS=\"");
  gsmSerial.print(RECIPIENT_PHONE);
  gsmSerial.println("\"");
  delay(1000);

  gsmSerial.print(messageText);
  delay(500);

  gsmSerial.write(26);
  delay(4000);

  Serial.println("SMS sent");
}

void sendAT(String command, int timeoutMs) {
  gsmSerial.println(command);
  long endTime = millis() + timeoutMs;

  while (millis() < endTime) {
    while (gsmSerial.available()) {
      char c = gsmSerial.read();
      Serial.write(c);
    }
  }
}
