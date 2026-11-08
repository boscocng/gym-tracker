# Scale bridge: ESP32 + Xiaomi Smart Scale S200

Step on the scale and an ESP32 near it posts the weight to the app's `/api/scale` endpoint. No phone, no Home Assistant and no custom firmware: `scale-bridge.yaml` is plain ESPHome configuration built from official components.

## How it works

The S200 broadcasts each reading as an encrypted Bluetooth advertisement. The ESP32 listens passively and never pairs with the scale. ESPHome's built-in `xiaomi_body_scale` component decrypts the reading with the scale's bindkey, and the board sends `{"weight_kg": ...}` to the app over HTTPS.

ESPHome recognizes all three S200 variants (product IDs 0x45C9, 0x4C04 and 0x4DCB), so it doesn't matter which one you have.

## Parts

- Xiaomi Smart Scale S200 (MJTZC02YM)
- An ESP32 dev board with Bluetooth, like the ESP32-WROOM-32 / DevKitC. Not the ESP32-S2, which has no Bluetooth.
- A USB cable and a USB charger, with the board placed within a few meters of the scale

## Why this config

These are all the public projects found (November 2026) that read the S200, or the related S400, from Bluetooth:

| Project | How it reads the scale | Verdict |
|---|---|---|
| ESPHome `xiaomi_body_scale` (in ESPHome since 2026.10.0, [PR #16476](https://github.com/esphome/esphome/pull/16476)) | Passive encrypted adverts plus bindkey, on an ESP32 | **Used here.** Official and reviewed by ESPHome maintainers. Unit tests decode known S200 and S400 packets, and it's maintained with ESPHome. It's new, so there are few field reports so far. Written by the maintainer of [bodymiscale](https://github.com/dckiller51/bodymiscale). |
| Home Assistant Xiaomi BLE ([xiaomi-ble](https://github.com/Bluetooth-Devices/xiaomi-ble)) | The same passive adverts | The most field-tested S200 decoder (S200 IDs added late 2025 to early 2026), but it needs Home Assistant running. Plan B: run this same ESP32 as an ESPHome Bluetooth proxy for Home Assistant. |
| [domdal/Homeassistant-Xiaomi-Smart-Scale-S200](https://github.com/domdal/Homeassistant-Xiaomi-Smart-Scale-S200) | Custom PlatformIO + NimBLE firmware, passive adverts | Says it was tested on an S200. Targets the ESP32-C6 and publishes to MQTT for Home Assistant. Plan C. |
| [Scuner/xiaomiS200_reversing_connection](https://github.com/Scuner/xiaomiS200_reversing_connection) | Active Bluetooth login with the Xiaomi app's token | More moving parts. The scale accepts one client at a time, so a phone nearby can take it over. |
| [faraga1/xiaomi-scale-s200-ble](https://github.com/faraga1/xiaomi-scale-s200-ble) | Bluetooth GATT protocol research | Research only, not a bridge. |
| [Dreaming-Codes/xiaomi-ble-scale-bridge](https://github.com/Dreaming-Codes/xiaomi-ble-scale-bridge), [jizzy002/XiaomiScale-Sync](https://github.com/jizzy002/XiaomiScale-Sync) | Android apps | Phone-based, not ESP32. |
| ESPHome `xiaomi_miscale`, [export2garmin](https://github.com/RobertWojtowicz/export2garmin), older Mi Scale ESP32 repos | Unencrypted adverts from the Mi Scale 2 and Body Composition Scale 2 | A different scale. Don't work with the S200. |

## Setup

1. Install ESPHome 2026.10.0 or newer: `pipx install esphome`, then check with `esphome version`.
2. Add the scale to the Xiaomi Home app. Step on the scale to wake it up. Pairing is what creates the encryption key.
3. Get the scale's MAC address and bindkey with [Xiaomi-cloud-tokens-extractor](https://github.com/PiotrMachowski/Xiaomi-cloud-tokens-extractor):

   ```sh
   curl -LO https://github.com/PiotrMachowski/Xiaomi-cloud-tokens-extractor/releases/latest/download/token_extractor.zip
   unzip token_extractor.zip && cd token_extractor
   pip3 install -r requirements.txt
   python3 token_extractor.py
   ```

   Log in with the QR code and leave the server region blank so it checks every region. S200 variants show up with model names like `xiaomi.scales.ms111` or `xiaomi.scales.ms113`. Copy the scale's MAC and its 32-character BLE KEY.
4. Run `cp secrets.example.yaml secrets.yaml` and fill it in. `ingest_token` must match `SCALE_INGEST_TOKEN` in Vercel.
5. Plug the ESP32 into your computer and flash it over USB: `esphome run scale-bridge.yaml`. The first flash has to be over USB because Bluetooth needs a partition change. Updates after that can go over Wi-Fi.
6. Watch the logs with `esphome logs scale-bridge.yaml` and step on the scale. You should see the weight, then a line like `Posted 77.65 kg, HTTP 201`.
7. Move the ESP32 to a USB charger near the scale.

## Troubleshooting

- **No weight in the logs**
  - Close Xiaomi Home on your phone and try again. One Home Assistant user only got readings after turning their phone off.
  - Double-check the MAC and bindkey. If in doubt, run the extractor again.
  - Make sure ESPHome is 2026.10.0 or newer.
  - To check whether the scale is broadcasting at all, add this under `esp32_ble_tracker:` for a moment and look for service UUID `0xFE95` when you step on the scale:

    ```yaml
    on_ble_advertise:
      - mac_address:
          - !secret scale_mac
        then:
          - lambda: |-
              ESP_LOGD("scale_adv", "advert from scale, rssi %d", x.get_rssi());
    ```

- **Weights stop after changing the scale's batteries.** The scale may stop broadcasting until it reconnects to Xiaomi Home once, and the key may change. Open Xiaomi Home next to the scale. If weights still don't arrive, run the extractor again and update `scale_bindkey`.
- **Don't remove and re-add the scale in Xiaomi Home.** Re-pairing creates a new key.
- **HTTP 401:** `ingest_token` doesn't match `SCALE_INGEST_TOKEN`.
- **HTTP 404 or a redirect:** the URL is wrong, or it's a Vercel preview URL.
- **Each weigh-in posts more than once:** this is expected. The server flags the duplicates.
- **The board reboots while posting:** raise `timeout` under `http_request`, and check free memory with ESPHome's `debug` component.
- **The scale moves between Wi-Fi networks:** list them under `wifi: networks:` instead of a single `ssid`.
- **The scale's Bluetooth icon keeps blinking after a weigh-in:** this is cosmetic. It wants to sync with the Xiaomi app, which this setup doesn't need.

## Sources

- [ESPHome: Xiaomi Body Scale](https://esphome.io/components/sensor/xiaomi_body_scale/)
- [ESPHome 2026.10.0 changelog](https://esphome.io/changelog/2026.10.0/)
- [ESPHome: HTTP Request](https://esphome.io/components/http_request/)
- [ESPHome: ESP32 BLE Tracker](https://esphome.io/components/esp32_ble_tracker/)
- [ESPHome: Native API (reboot_timeout)](https://esphome.io/components/api/)
- [xiaomi-ble #263: S200 variant IDs and models](https://github.com/Bluetooth-Devices/xiaomi-ble/issues/263)
- [xiaomi-ble #292: S200 setup with a bindkey](https://github.com/Bluetooth-Devices/xiaomi-ble/issues/292)
- [xiaomi-ble PR #241: S200 behavior after a battery change](https://github.com/Bluetooth-Devices/xiaomi-ble/pull/241)
