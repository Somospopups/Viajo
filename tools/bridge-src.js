/* Puente nativo para la APK (Capacitor).
   Se empaqueta con esbuild a www/bridge.js y solo existe en la app Android;
   en la web (GitHub Pages) no se carga, así que window.CapBridge queda indefinido. */
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Geolocation } from '@capacitor/geolocation';
import { App } from '@capacitor/app';

window.CapBridge = {
  Capacitor: Capacitor,
  LocalNotifications: LocalNotifications,
  Geolocation: Geolocation,
  App: App,
  isNative: !!Capacitor.isNativePlatform()
};
