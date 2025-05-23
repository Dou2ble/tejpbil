#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <WebSocketsServer.h>
#include <Wire.h>
#include <HTTPClient.h>

// START 10dof
// I2Cdev and MPU9250 must be installed as libraries, or else the .cpp/.h files
// for both classes must be in the include path of your project
#include "I2Cdev.h"
#include "MPU9250.h"
#include "BMP280.h"
// END 10dof

#include "index.h"

#define CMD_STOP 0
#define CMD_FORWARD 1
#define CMD_BACKWARD 2
#define CMD_LEFT 4
#define CMD_RIGHT 8

#define ENA_PIN 32  // ENA pin
#define IN1_PIN 15  // IN1 pin
#define IN2_PIN 33  // IN2 pin
#define IN3_PIN 27  // IN3 pin
#define IN4_PIN 12  // IN4 pin
#define ENB_PIN 13  // ENB pin
#define SDA_PIN 25  // I2C SDA
#define SCL_PIN 26  // I2C SCL

// START 10dof
MPU9250 accelgyro;
I2Cdev   I2C_M;

uint8_t buffer_m[6];


int16_t ax, ay, az;
int16_t gx, gy, gz;
int16_t   mx, my, mz;



float heading;
float tiltheading;

float Axyz[3];
float Gxyz[3];
float Mxyz[3];


#define sample_num_mdate  5000

volatile float mx_sample[3];
volatile float my_sample[3];
volatile float mz_sample[3];

static float mx_centre = 0;
static float my_centre = 0;
static float mz_centre = 0;

volatile int mx_max = 0;
volatile int my_max = 0;
volatile int mz_max = 0;

volatile int mx_min = 0;
volatile int my_min = 0;
volatile int mz_min = 0;

float temperature;
float pressure;
float atm;
float altitude;
BMP280 bmp280;
// END 10dof

bool isSelfDriving = false;

String _10dofData;

const char* ssid = "SSIS_IOT";
const char* password = "hRBjs7Ye";

AsyncWebServer server(80);
WebSocketsServer webSocket = WebSocketsServer(81);

void webSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
    switch (type) {
        case WStype_DISCONNECTED:
            Serial.printf("[%u] Disconnected!\n", num);
            break;
        case WStype_CONNECTED:
            {
                IPAddress ip = webSocket.remoteIP(num);
                Serial.printf("[%u] Connected from %d.%d.%d.%d\n", num, ip[0], ip[1], ip[2], ip[3]);
            }
            break;
        case WStype_TEXT:
            int command = String((char*)payload).toInt();
            Serial.print("Command: ");
            Serial.println(command);
            switch (command) {
                case CMD_STOP: CAR_stop(); break;
                case CMD_FORWARD: CAR_moveForward(); break;
                case CMD_BACKWARD: CAR_moveBackward(); break;
                case CMD_LEFT: CAR_turnLeft(); break;
                case CMD_RIGHT: CAR_turnRight(); break;
                default: Serial.println("Unknown command");
            }
            break;
    }
}

void setup() {
    Serial.begin(9600);

    // START 10dof
    Serial.println("Initializing I2C devices...");
    accelgyro.initialize();
    bmp280.init();

    Serial.println("Testing device connections...");
    Serial.println(accelgyro.testConnection() ? "MPU9250 connection successful" : "MPU9250 connection failed");

    delay(1000);
    // END 10dof

    Wire.begin(SDA_PIN, SCL_PIN);

    pinMode(ENA_PIN, OUTPUT);
    pinMode(IN1_PIN, OUTPUT);
    pinMode(IN2_PIN, OUTPUT);
    pinMode(IN3_PIN, OUTPUT);
    pinMode(IN4_PIN, OUTPUT);
    pinMode(ENB_PIN, OUTPUT);

    digitalWrite(ENA_PIN, HIGH);
    digitalWrite(ENB_PIN, HIGH);

    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(1000);
        Serial.println("Connecting to WiFi...");
    }
    Serial.println("Connected to WiFi");

    webSocket.begin();
    webSocket.onEvent(webSocketEvent);
    server.on("/", HTTP_GET, [](AsyncWebServerRequest* request) {
        request->send(200, "text/html", HTML_CONTENT);
    });

    server.on("/10dof", HTTP_GET, [](AsyncWebServerRequest* request) {
        request->send(200, "text/plain", _10dofData);
    });

    server.on("/enable-self-driving", HTTP_GET, [](AsyncWebServerRequest* request) {
       	isSelfDriving = true;
        request->send(200, "text/plain", "ok");
    });

    server.on("/disable-self-driving", HTTP_GET, [](AsyncWebServerRequest* request) {
       	isSelfDriving = false;
        request->send(200, "text/plain", "ok");
    });

    server.on("/get-self-driving", HTTP_GET, [](AsyncWebServerRequest* request) {
        request->send(200, "text/plain", isSelfDriving ? "true" : "false");
    });

    // START GPS TRACKER
    server.on("/gps", HTTP_GET, [](AsyncWebServerRequest* request) {
      String html = HTML_CONTENT;

      HTTPClient http;
      http.begin("https://track.ssis.nu/last/T10");
      int httpResponseCode = http.GET();
      // Serial.println("GPS Response Code: " + String(httpResponseCode));

      request->send(200, "application/json", http.getString());
    });
    // END GPS TRACKER

    server.begin();
    Serial.print("ESP32 Web Server's IP address: ");
    Serial.println(WiFi.localIP());
}

// START 10dof
void _10dofUpdate() {
    getAccel_Data();
    getGyro_Data();
    getCompassDate_calibrated(); // compass data has been calibrated here
    getHeading();               //before we use this function we should run 'getCompassDate_calibrated()' frist, so that we can get calibrated data ,then we can get correct angle .
    getTiltHeading();

    temperature = bmp280.getTemperature(); //Get the temperature, bmp180ReadUT MUST be called first
    pressure = bmp280.getPressure();//Get the temperature
    altitude = bmp280.calcAltitude(pressure); //Uncompensated caculation - in Meters
    atm = pressure / 101325;

    _10dofData = (
      // Callibration parameters
      String(mx_centre) + "\n" +
      String(my_centre) + "\n" +
      String(mz_centre) + "\n" +
      // Acceleration xyz
      String(Axyz[0]) + "\n" +
      String(Axyz[1]) + "\n" +
      String(Axyz[2]) + "\n" +
      // Gyro xyz
      String(Gxyz[0]) + "\n" +
      String(Gxyz[1]) + "\n" +
      String(Gxyz[2]) + "\n" +
      // Compass xyz
      String(Mxyz[0]) + "\n" +
      String(Mxyz[1]) + "\n" +
      String(Mxyz[2]) + "\n" +
      // The clockwise angle between the magnetic north and X-Axis
      String(heading) + "\n" +
      // The clockwise angle between the magnetic north and the projection of the positive X-Axis in the horizontal plane:
      String(tiltheading) + "\n" +
      // temperature
      String(temperature) + "\n" +
      // pressure
      String(pressure) + "\n" +
      // related atmosphere
      String(atm) + "\n" +
      // altitude
      String(altitude) + "\n"
     );
}
// end 10dof

void loop() {
    for (int i = 0; i < 5; i++) {
      webSocket.loop();
      delay(20);
    }
    _10dofUpdate();
}

void CAR_moveBackward() {
    digitalWrite(IN1_PIN, HIGH);
    digitalWrite(IN2_PIN, LOW);
    digitalWrite(IN3_PIN, HIGH);
    digitalWrite(IN4_PIN, LOW);
}

void CAR_moveForward() {
    digitalWrite(IN1_PIN, LOW);
    digitalWrite(IN2_PIN, HIGH);
    digitalWrite(IN3_PIN, LOW);
    digitalWrite(IN4_PIN, HIGH);
}

void CAR_turnRight() {
    digitalWrite(IN1_PIN, HIGH);
    digitalWrite(IN2_PIN, LOW);
    digitalWrite(IN3_PIN, LOW);
    digitalWrite(IN4_PIN, HIGH);
}

void CAR_turnLeft() {
    digitalWrite(IN1_PIN, LOW);
    digitalWrite(IN2_PIN, HIGH);
    digitalWrite(IN3_PIN, HIGH);
    digitalWrite(IN4_PIN, LOW);
}

void CAR_stop() {
    digitalWrite(IN1_PIN, LOW);
    digitalWrite(IN2_PIN, LOW);
    digitalWrite(IN3_PIN, LOW);
    digitalWrite(IN4_PIN, LOW);
}


// START 10dof
void getHeading(void) {
    heading = 180 * atan2(Mxyz[1], Mxyz[0]) / PI;
    if (heading < 0) heading += 360;
}

void getTiltHeading(void) {
    float pitch = asin(-Axyz[0]);
    float roll = asin(Axyz[1] / cos(pitch));

    float xh = Mxyz[0] * cos(pitch) + Mxyz[2] * sin(pitch);
    float yh = Mxyz[0] * sin(roll) * sin(pitch) + Mxyz[1] * cos(roll) - Mxyz[2] * sin(roll) * cos(pitch);
    float zh = -Mxyz[0] * cos(roll) * sin(pitch) + Mxyz[1] * sin(roll) + Mxyz[2] * cos(roll) * cos(pitch);
    tiltheading = 180 * atan2(yh, xh) / PI;
    if (yh < 0)    tiltheading += 360;
}

void Mxyz_init_calibrated () {
    Serial.println(F("Before using 9DOF,we need to calibrate the compass frist,It will takes about 2 minutes."));
    Serial.print("  ");
    Serial.println(F("During  calibratting ,you should rotate and turn the 9DOF all the time within 2 minutes."));
    Serial.print("  ");
    Serial.println(F("If you are ready ,please sent a command data 'ready' to start sample and calibrate."));
    while (!Serial.find("ready"));
    Serial.println("  ");
    Serial.println("ready");
    Serial.println("Sample starting......");
    Serial.println("waiting ......");

    get_calibration_Data ();

    Serial.println("     ");
    Serial.println("compass calibration parameter ");
    Serial.print(mx_centre);
    Serial.print("     ");
    Serial.print(my_centre);
    Serial.print("     ");
    Serial.println(mz_centre);
    Serial.println("    ");
}

void get_calibration_Data () {
    for (int i = 0; i < sample_num_mdate; i++)
    {
        get_one_sample_date_mxyz();
        /*
        Serial.print(mx_sample[2]);
        Serial.print(" ");
        Serial.print(my_sample[2]);                            //you can see the sample data here .
        Serial.print(" ");
        Serial.println(mz_sample[2]);
        */

        if (mx_sample[2] >= mx_sample[1])mx_sample[1] = mx_sample[2];
        if (my_sample[2] >= my_sample[1])my_sample[1] = my_sample[2]; //find max value
        if (mz_sample[2] >= mz_sample[1])mz_sample[1] = mz_sample[2];

        if (mx_sample[2] <= mx_sample[0])mx_sample[0] = mx_sample[2];
        if (my_sample[2] <= my_sample[0])my_sample[0] = my_sample[2]; //find min value
        if (mz_sample[2] <= mz_sample[0])mz_sample[0] = mz_sample[2];

    }

    mx_max = mx_sample[1];
    my_max = my_sample[1];
    mz_max = mz_sample[1];

    mx_min = mx_sample[0];
    my_min = my_sample[0];
    mz_min = mz_sample[0];

    mx_centre = (mx_max + mx_min) / 2;
    my_centre = (my_max + my_min) / 2;
    mz_centre = (mz_max + mz_min) / 2;

}

void get_one_sample_date_mxyz() {
    getCompass_Data();
    mx_sample[2] = Mxyz[0];
    my_sample[2] = Mxyz[1];
    mz_sample[2] = Mxyz[2];
}

void getAccel_Data(void) {
    accelgyro.getMotion9(&ax, &ay, &az, &gx, &gy, &gz, &mx, &my, &mz);
    Axyz[0] = (double) ax / 16384;
    Axyz[1] = (double) ay / 16384;
    Axyz[2] = (double) az / 16384;
}

void getGyro_Data(void) {
    accelgyro.getMotion9(&ax, &ay, &az, &gx, &gy, &gz, &mx, &my, &mz);
    Gxyz[0] = (double) gx * 250 / 32768;
    Gxyz[1] = (double) gy * 250 / 32768;
    Gxyz[2] = (double) gz * 250 / 32768;
}

void getCompass_Data(void) {
    I2C_M.writeByte(MPU9150_RA_MAG_ADDRESS, 0x0A, 0x01); //enable the magnetometer
    delay(10);
    I2C_M.readBytes(MPU9150_RA_MAG_ADDRESS, MPU9150_RA_MAG_XOUT_L, 6, buffer_m);

    mx = ((int16_t)(buffer_m[1]) << 8) | buffer_m[0] ;
    my = ((int16_t)(buffer_m[3]) << 8) | buffer_m[2] ;
    mz = ((int16_t)(buffer_m[5]) << 8) | buffer_m[4] ;

    Mxyz[0] = (double) mx * 1200 / 4096;
    Mxyz[1] = (double) my * 1200 / 4096;
    Mxyz[2] = (double) mz * 1200 / 4096;
}

void getCompassDate_calibrated () {
    getCompass_Data();
    Mxyz[0] = Mxyz[0] - mx_centre;
    Mxyz[1] = Mxyz[1] - my_centre;
    Mxyz[2] = Mxyz[2] - mz_centre;
}
// END 10dof
