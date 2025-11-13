package com.anonymous.testapp.ble

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class BLEAdvertiserModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "BLEAdvertiser"

    @ReactMethod
    fun init() {
        BLEAdvertiser.init(reactApplicationContext)
    }

    @ReactMethod
    fun startAdvertising(deviceId: String) {
        BLEAdvertiser.startAdvertising(deviceId)
    }

    @ReactMethod
    fun stopAdvertising() {
        BLEAdvertiser.stopAdvertising()
    }
}
