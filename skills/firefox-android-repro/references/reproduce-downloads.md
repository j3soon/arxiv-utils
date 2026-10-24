# Reproduce Firefox for Android downloads

Run the comparison commands from the repository root. The examples reproduce the investigation of `2440ee2` against its parent `fe0e157`. For another change, substitute the relevant before/after revisions and use fresh source export directories.

See [the recorded findings](download-findings.md) for the tested versions, official sources, observed results, and limits of the original investigation. Different browser versions may behave differently.

## Reproduce on an existing Android device or emulator

1. Install Firefox for Android 156.0. Enable **Remote debugging via USB** in Firefox and USB debugging on the Android device. The emulator in this run used Android 15 (API 35), AOSP x86_64.
2. Ensure `adb devices` lists the target device and that the host has Node.js, npm, Python 3, and Git. The setup below also uses `curl` and `unzip`.
3. From this repository, export the original and fixed revisions into separate directories:

   ```sh
   export REPRO_ROOT="$(git rev-parse --show-toplevel)/artifacts/firefox-android-repro"
   export REPORT_DIR="$REPRO_ROOT/reports"
   mkdir -p "$REPORT_DIR"
   mkdir -p "$REPRO_ROOT/before" "$REPRO_ROOT/after"
   git archive fe0e157 firefox | tar -x -C "$REPRO_ROOT/before"
   git archive 2440ee2 firefox | tar -x -C "$REPRO_ROOT/after"
   export ADB_BIN="$REPRO_ROOT/sdk/platform-tools/adb"
   # Use your own adb path if you did not follow the isolated setup below.
   export ANDROID_REPRO_DEVICE=emulator-5554
   ```

4. Start the original extension in a terminal and keep the command running:

   ```sh
   npm exec --yes --package=web-ext@10.7.0 -- web-ext run \
     -t firefox-android \
     --source-dir "$REPRO_ROOT/before/firefox" \
     --adb-bin "$ADB_BIN" --adb-device "$ANDROID_REPRO_DEVICE" \
     --firefox-apk org.mozilla.firefox --no-reload --no-input \
     --adb-discovery-timeout 30000
   ```

   Complete Firefox onboarding and dismiss the extension-installed notice if shown. This is a temporary extension install in the emulator's normal Firefox profile, not a signed release install. Use a disposable profile/device for reproducibility.

5. In a second terminal at the repository root, set the same `REPRO_ROOT`, `REPORT_DIR`, `ADB_BIN`, and `ANDROID_REPRO_DEVICE` variables. Open the paper and wait for **Direct Download** to appear:

   ```sh
   "$ADB_BIN" -s "$ANDROID_REPRO_DEVICE" shell am start \
     -a android.intent.action.VIEW \
     -d 'https://arxiv.org/abs/2501.00001?download-test=before' \
     org.mozilla.firefox
   "$ADB_BIN" -s "$ANDROID_REPRO_DEVICE" shell ls -la /sdcard/Download
   ```

6. Tap the injected **Direct Download** button using the emulator UI or `adb shell input tap X Y`. Coordinates must come from the current screen, not from this run. In a headless emulator, locate the button with:

   ```sh
   "$ADB_BIN" -s "$ANDROID_REPRO_DEVICE" shell uiautomator dump /sdcard/ui.xml
   "$ADB_BIN" -s "$ANDROID_REPRO_DEVICE" pull /sdcard/ui.xml "$REPORT_DIR/ui.xml"
   ```

   Find the visible node with `text="Direct Download"` in the XML and tap the center of its `bounds`. Record whether a new file is saved or a PDF preview opens. With `fe0e157` in the tested environment, neither happens.

7. Capture the real browser's state and cached console errors using the TCP port printed by `web-ext`:

   ```sh
   python3 skills/firefox-android-repro/scripts/android_rdp_probe.py --port PORT_FROM_WEB_EXT \
     --output "$REPORT_DIR/before-result.json"
   "$ADB_BIN" -s "$ANDROID_REPRO_DEVICE" exec-out screencap -p \
     > "$REPORT_DIR/before-after-click.png"
   ```

8. Stop `web-ext` with Ctrl+C. Repeat steps 4–7 with `--source-dir "$REPRO_ROOT/after/firefox"`, the query `?download-test=after`, and output names `after-result.json` and `after-after-click.png`. Read the **new** TCP port from this new `web-ext` session. For `2440ee2`, observe the PDF preview tab and check that no new file appears until you tap **Download** in that viewer. Pull the newly saved PDF into `REPORT_DIR` with `adb pull`, verify that its contents start with `%PDF-`, and record its filename, size, and SHA-256. The original run's values are in [the findings](download-findings.md#results).
9. Optionally isolate the native API behavior, without altering its implementation:

   ```sh
   python3 skills/firefox-android-repro/scripts/android_rdp_probe.py --port PORT_FROM_WEB_EXT \
     --output "$REPORT_DIR/native-probe.json" --native-probe \
     --observation-seconds 15
   "$ADB_BIN" -s "$ANDROID_REPRO_DEVICE" shell ls -la /sdcard/Download
   ```

   This calls the real API to request `native-api-probe.pdf`. A `null` last poll means the probe is still pending at the end of that observation window. It is a real download request, so a browser that supports the API may save this file.

The probe script speaks the Firefox Remote Debugging Protocol using Python's standard library. It has been tested against Firefox for Android 156; future protocol changes may require updating it.

## Reuse the retained headless emulator

The SDK, downloaded archives, APK, AVD, and Firefox profile are retained under `artifacts/firefox-android-repro/`. Reuse them after a host reboot without downloading or installing again. From the repository root:

```sh
export REPRO_ROOT="$(git rev-parse --show-toplevel)/artifacts/firefox-android-repro"
export ANDROID_HOME="$REPRO_ROOT/sdk"
export ANDROID_AVD_HOME="$REPRO_ROOT/avd"
export ADB_BIN="$REPRO_ROOT/sdk/platform-tools/adb"
export ANDROID_REPRO_DEVICE=emulator-5554
"$ADB_BIN" devices
# Start only if this emulator is not already running:
"$REPRO_ROOT/sdk/emulator/emulator" -avd arxivreview \
  -port 5554 -no-window -no-audio -no-boot-anim -no-snapshot \
  -gpu swiftshader_indirect -accel on -memory 2048 -cores 2 \
  > "$REPRO_ROOT/emulator.log" 2>&1 &
"$ADB_BIN" -s "$ANDROID_REPRO_DEVICE" wait-for-device
# Wait until this prints 1 before running web-ext:
"$ADB_BIN" -s "$ANDROID_REPRO_DEVICE" shell getprop sys.boot_completed
```

Then follow the comparison procedure above. If port 5554 is occupied by another emulator, choose an unused even port and update both `-port` and `ANDROID_REPRO_DEVICE`. The AVD locator `avd/arxivreview.ini` contains an absolute path. If the repository moves, update that path to the new `REPRO_ROOT/avd/arxivreview.avd` before booting.

## First-time headless emulator setup

Run this setup once when the environment does not exist. It downloads official binaries into the ignored `artifacts/firefox-android-repro/` directory, requires Linux x86_64 with readable/writable `/dev/kvm`, and needs about 5 GB of disk space. Java and Android Studio are not needed. The official download sources and Android extension development instructions are linked in [the recorded findings](download-findings.md#sources).

```sh
export REPRO_ROOT="$(git rev-parse --show-toplevel)/artifacts/firefox-android-repro"
mkdir -p "$REPRO_ROOT/sdk/system-images/android-35/default" "$REPRO_ROOT/avd/arxivreview.avd"

curl -fL -o "$REPRO_ROOT/platform-tools.zip" \
  https://dl.google.com/android/repository/platform-tools_r37.0.1-linux.zip
curl -fL -o "$REPRO_ROOT/emulator.zip" \
  https://dl.google.com/android/repository/emulator-linux_x64-15917651.zip
curl -fL -o "$REPRO_ROOT/system-image.zip" \
  https://dl.google.com/android/repository/sys-img/android/x86_64-35_r02.zip
unzip -q "$REPRO_ROOT/platform-tools.zip" -d "$REPRO_ROOT/sdk"
unzip -q "$REPRO_ROOT/emulator.zip" -d "$REPRO_ROOT/sdk"
unzip -q "$REPRO_ROOT/system-image.zip" -d "$REPRO_ROOT/sdk/system-images/android-35/default"

cat > "$REPRO_ROOT/avd/arxivreview.ini" <<EOF
avd.ini.encoding=UTF-8
path=$REPRO_ROOT/avd/arxivreview.avd
target=android-35
EOF

cat > "$REPRO_ROOT/avd/arxivreview.avd/config.ini" <<'EOF'
avd.ini.encoding=UTF-8
AvdId=arxivreview
avd.ini.displayname=arxivreview
hw.cpu.arch=x86_64
hw.cpu.ncore=2
hw.ramSize=2048
hw.lcd.width=720
hw.lcd.height=1280
hw.lcd.density=320
hw.keyboard=yes
hw.gpu.enabled=yes
hw.gpu.mode=swiftshader_indirect
hw.audioInput=no
hw.audioOutput=no
hw.mainKeys=no
hw.sdCard=no
disk.dataPartition.size=2G
image.sysdir.1=system-images/android-35/default/x86_64/
tag.id=default
abi.type=x86_64
PlayStore.enabled=false
showDeviceFrame=no
EOF

export ANDROID_HOME="$REPRO_ROOT/sdk"
export ANDROID_AVD_HOME="$REPRO_ROOT/avd"
export ADB_BIN="$REPRO_ROOT/sdk/platform-tools/adb"
export ANDROID_REPRO_DEVICE=emulator-5554
"$REPRO_ROOT/sdk/emulator/emulator" -avd arxivreview \
  -port 5554 -no-window -no-audio -no-boot-anim -no-snapshot \
  -gpu swiftshader_indirect -accel on -memory 2048 -cores 2 \
  > "$REPRO_ROOT/emulator.log" 2>&1 &
"$ADB_BIN" -s "$ANDROID_REPRO_DEVICE" wait-for-device
# Wait until this prints 1 before installing Firefox:
"$ADB_BIN" -s "$ANDROID_REPRO_DEVICE" shell getprop sys.boot_completed

curl -fL -o "$REPRO_ROOT/firefox.apk" \
  https://archive.mozilla.org/pub/fenix/releases/156.0/android/fenix-156.0-android-x86_64/fenix-156.0.multi.android-x86_64.apk
"$ADB_BIN" -s "$ANDROID_REPRO_DEVICE" install "$REPRO_ROOT/firefox.apk"
"$ADB_BIN" -s "$ANDROID_REPRO_DEVICE" shell am start \
  -a android.intent.action.VIEW -d https://arxiv.org/abs/2501.00001 \
  org.mozilla.firefox
```

Complete onboarding and enable remote debugging in Firefox. With a headless, disposable **AOSP** emulator, `adb root` also permits editing the app's preferences offline. This was used in this run after the first launch created the preferences file:

```sh
"$ADB_BIN" -s "$ANDROID_REPRO_DEVICE" root
"$ADB_BIN" -s "$ANDROID_REPRO_DEVICE" wait-for-device
"$ADB_BIN" -s "$ANDROID_REPRO_DEVICE" shell am force-stop org.mozilla.firefox
"$ADB_BIN" -s "$ANDROID_REPRO_DEVICE" pull \
  /data/data/org.mozilla.firefox/shared_prefs/fenix_preferences.xml \
  "$REPRO_ROOT/fenix_preferences.xml"
python3 - <<'PY'
import os
import xml.etree.ElementTree as E
from pathlib import Path
path = Path(os.environ['REPRO_ROOT']) / 'fenix_preferences.xml'
tree = E.parse(path)
root = tree.getroot()
for element in list(root):
    if element.get('name') == 'pref_key_remote_debugging':
        root.remove(element)
E.SubElement(root, 'boolean', {'name': 'pref_key_remote_debugging', 'value': 'true'})
tree.write(path, encoding='utf-8', xml_declaration=True)
PY
"$ADB_BIN" -s "$ANDROID_REPRO_DEVICE" push \
  "$REPRO_ROOT/fenix_preferences.xml" \
  /data/data/org.mozilla.firefox/shared_prefs/fenix_preferences.xml
```

Then follow the comparison procedure above. On a physical device or a non-rootable image, enable remote debugging through Firefox's UI instead.

After the run, stop `web-ext` and then stop the emulator:

```sh
"$ADB_BIN" -s "$ANDROID_REPRO_DEVICE" emu kill
```

The downloaded SDK, emulator image, APK, and test profiles persist under the ignored repository-root `artifacts/firefox-android-repro/` directory and are not tracked. Store run evidence in `REPORT_DIR`, which defaults to `artifacts/firefox-android-repro/reports/`. The setup instructions and probe script are tracked under `skills/firefox-android-repro/`.
