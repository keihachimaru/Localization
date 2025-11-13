import { NativeModules } from "react-native";

const { BLEAdvertiser } = NativeModules;

export default {
  init: () => BLEAdvertiser.init(),
  start: (id: string) => BLEAdvertiser.startAdvertising(id),
  stop: () => BLEAdvertiser.stopAdvertising(),
};
