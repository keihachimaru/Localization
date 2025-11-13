import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Platform,
  PermissionsAndroid,
} from "react-native";
import { NativeModules } from 'react-native';
import { BleManager } from "react-native-ble-plx";
import { decode as atob } from "base-64";

const { BLEAdvertiser } = NativeModules;
// Generate random unique id
const SERVICE_UUID = "TS";
const uniqueId = SERVICE_UUID+':'+Math.floor(Math.random() * 1000000).toString();

// Rough RSSI → distance formula
function rssiToDistance(rssi: number, txPower = -59) {
  if (rssi === 0) return -1;
  const ratio = rssi / txPower;
  if (ratio < 1) {
    return Math.pow(ratio, 10);
  } else {
    return (0.89976) * Math.pow(ratio, 7.7095) + 0.111;
  }
}

async function requestPermissions() {
  if (Platform.OS === "android" && Platform.Version >= 31) {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);

    Object.entries(granted).forEach(([key, value]) => {
      if (value !== PermissionsAndroid.RESULTS.GRANTED) {
        console.warn(`${key} not granted`);
      }
    });
  }
}

function base64ToUtf8(base64: string): string {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary.split("").map(c => c.charCodeAt(0)));
  return new TextDecoder().decode(bytes);
}

export default function App() {
  const [devices, setDevices] = useState<{ id: string; rssi: number; distance: number }[]>([]);
  const [manager] = useState(() => new BleManager());
  const wsRef = useRef<any>(null);

  useEffect(() => {
      // change localhost to your server address if needed
      wsRef.current = new WebSocket("ws://f253a613a014.ngrok-free.app/");
  
      wsRef.current.onopen = () => {
        console.log("connected to WS server");
      };
  
      wsRef.current.onmessage = (event) => {
        console.log("Message from server:", event.data);
      };
  
      wsRef.current.onclose = () => {
        console.log("WebSocket closed");
      };
  
      wsRef.current.onerror = (err) => {
        console.error("WebSocket error:", err);
      };
  
      return () => wsRef.current?.close();
    }, []);

  useEffect(() => {
    let subscription: any;
    let interval: any;

    requestPermissions().then(() => {
      // Start advertising
      BLEAdvertiser.init();
      BLEAdvertiser.start(uniqueId);

      // Keep rebroadcasting
      interval = setInterval(() => {
        BLEAdvertiser.start(uniqueId);
        console.log('ADVERTISING '+uniqueId);
      }, 1000);

      // Scan
      subscription = manager.onStateChange(
        (state) => {
          if (state === "PoweredOn") {
            manager.startDeviceScan(null, null, (error, device) => {
              if (error) {
                console.error(error);
                return;
              }
              if (device?.serviceData) {
                const [uuid, base64Data] =
                  Object.entries(device.serviceData)[0] || [];

                if (base64Data) {
                  // Decode payload back to string ID
                  const id = base64ToUtf8(base64Data);

                  if(!id.startsWith(SERVICE_UUID+':')) {
                    console.log('Failed : '+id)
                    return
                  }
                  console.log('Detecetd : '+id)

                  const distMeters = rssiToDistance(device.rssi!);
                  const distanceCm = distMeters * 100;

                  setDevices((prev) => {
                    const existing = prev.find((d) => d.id === id);
                    if (existing) {
                      return prev.map((d) =>
                        d.id === id
                          ? { ...d, rssi: device.rssi!, distance: distanceCm }
                          : d
                      );
                    }
                    return [
                      ...prev,
                      { id, rssi: device.rssi!, distance: distanceCm },
                    ];
                  });

                  if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    const observation = {
                      type: "observation",
                      payload: {
                        fromId: uniqueId,        // this device's unique ID
                        observedDeviceId: id,    // scanned device ID
                        distanceMeters: distMeters,
                      },
                    };
                    wsRef.current.send(JSON.stringify(observation));
                  }
                }
              }
            });
          }
        },
        true
      );
    });

    return () => {
      clearInterval(interval);
      console.log('STOOOOP');
      BLEAdvertiser.stopAdvertising();
      subscription?.remove();
      manager.stopDeviceScan();
    };
  }, [manager]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My unique ID: {uniqueId}</Text>
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.deviceCard}>
            <Text>Device ID: {item.id}</Text>
            <Text>RSSI: {item.rssi} dBm</Text>
            <Text>Distance: {item.distance.toFixed(2)} cm</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, marginTop: 40, backgroundColor: "white" },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 16, color: "black" },
  deviceCard: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: "#f2f2f2",
  },
});
