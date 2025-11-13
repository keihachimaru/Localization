package com.anonymous.testapp.ble

import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context
import android.os.ParcelUuid
import java.util.*

object BLEAdvertiser {
    private var advertiser: BluetoothLeAdvertiser? = null
    private var callback: AdvertiseCallback? = null

    // Fixed service UUID (must match your index.tsx)
    private val SERVICE_UUID: UUID = UUID.fromString("12345678-1234-5678-1234-567891234567")

    fun init(context: Context) {
        val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        val adapter = manager.adapter
        advertiser = adapter.bluetoothLeAdvertiser
    }

    fun startAdvertising(deviceId: String) {
        advertiser ?: return

        val settings = AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            .setConnectable(false)
            .build()

        // Encode uniqueId as serviceData under a fixed UUID
        val serviceData = deviceId.toByteArray(Charsets.UTF_8)

        val data = AdvertiseData.Builder()
            .addServiceData(ParcelUuid(SERVICE_UUID), serviceData)
            .setIncludeDeviceName(false)
            .build()

        callback = object : AdvertiseCallback() {}
        advertiser?.startAdvertising(settings, data, callback)
    }

    fun stopAdvertising() {
        advertiser?.stopAdvertising(callback)
    }
}
