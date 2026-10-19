name: Build APK

on:
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17

      - name: Prepare web files
        run: |
          mkdir www
          cp index.html www/
          cp sw.js www/

      - name: Create Android project
        run: |
          npm init -y
          npm install @capacitor/core@6 @capacitor/cli@6 @capacitor/android@6
          npx cap init ArchiPlan com.adamu.archiplan --web-dir www
          npx cap add android
          npx cap sync android

      - name: Set app icon from logo
        run: |
          pip install pillow
          python3 - <<'PY'
          import re, base64, io, os, shutil
          from PIL import Image, ImageDraw
          html = open('index.html').read()
          m = re.search(r'const I512="data:image/webp;base64,([^"]+)"', html)
          logo = Image.open(io.BytesIO(base64.b64decode(m.group(1)))).convert('RGBA')
          shutil.rmtree('android/app/src/main/res/mipmap-anydpi-v26', ignore_errors=True)
          sizes = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
          for d, s in sizes.items():
              big = logo.resize((s * 4, s * 4), Image.LANCZOS)
              for name, round_icon in (('ic_launcher', False), ('ic_launcher_round', True)):
                  mask = Image.new('L', (s * 4, s * 4), 0)
                  draw = ImageDraw.Draw(mask)
                  if round_icon:
                      draw.ellipse((0, 0, s * 4 - 1, s * 4 - 1), fill=255)
                  else:
                      draw.rounded_rectangle((0, 0, s * 4 - 1, s * 4 - 1), radius=int(s * 4 * 0.22), fill=255)
                  out = Image.new('RGBA', big.size, (0, 0, 0, 0))
                  out.paste(big, (0, 0), mask)
                  out = out.resize((s, s), Image.LANCZOS)
                  p = 'android/app/src/main/res/mipmap-' + d
                  os.makedirs(p, exist_ok=True)
                  out.save(p + '/' + name + '.png')
          PY

      - name: Build APK
        working-directory: android
        run: |
          chmod +x gradlew
          ./gradlew assembleDebug

      - uses: actions/upload-artifact@v4
        with:
          name: ArchiPlan-APK
          path: android/app/build/outputs/apk/debug/app-debug.apk
