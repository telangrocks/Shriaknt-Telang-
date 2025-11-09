# 📱 Android App Build Guide

Complete guide for building and testing the Cryptopulse Android app.

## Prerequisites

- Android Studio Arctic Fox or later
- JDK 17 or later
- Android SDK (API 24+)
- Gradle 7.5+

## Setup

### 1. Open Project

1. Open Android Studio
2. Select "Open an Existing Project"
3. Navigate to `android-app/` directory
4. Wait for Gradle sync to complete

### 2. Configure API Endpoint

Edit `app/build.gradle.kts`:

```kotlin
buildConfigField("String", "API_BASE_URL", "\"https://api.yourdomain.com\"")
```

### 3. Configure Cashfree

```kotlin
buildConfigField("String", "CASHFREE_APP_ID", "\"your-cashfree-app-id\"")
buildConfigField("String", "CASHFREE_ENV", "\"production\"")
```

### 4. Sync Gradle

Click "Sync Now" or run:
```bash
./gradlew build --refresh-dependencies
```

## Building

### Debug Build

```bash
./gradlew assembleDebug
```

Output: `app/build/outputs/apk/debug/app-debug.apk`

### Release Build

1. Generate keystore (if not exists):
```bash
keytool -genkey -v -keystore cryptopulse-release.keystore -alias cryptopulse -keyalg RSA -keysize 2048 -validity 10000
```

2. Create `keystore.properties`:
```properties
storePassword=your-store-password
keyPassword=your-key-password
keyAlias=cryptopulse
storeFile=../cryptopulse-release.keystore
```

3. Update `app/build.gradle.kts`:
```kotlin
android {
    signingConfigs {
        create("release") {
            val keystorePropertiesFile = rootProject.file("keystore.properties")
            val keystoreProperties = Properties()
            keystoreProperties.load(FileInputStream(keystorePropertiesFile))
            
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["storePassword"] as String
            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["keyPassword"] as String
        }
    }
    buildTypes {
        getByName("release") {
            signingConfig = signingConfigs.getByName("release")
        }
    }
}
```

4. Build release:
```bash
./gradlew assembleRelease
```

Output: `app/build/outputs/apk/release/app-release.apk`

### App Bundle (AAB) for Play Store

```bash
./gradlew bundleRelease
```

Output: `app/build/outputs/bundle/release/app-release.aab`

## Testing

### Unit Tests

```bash
./gradlew test
```

### Instrumented Tests

```bash
./gradlew connectedAndroidTest
```

### Manual Testing Checklist

- [ ] App installs successfully
- [ ] Splash screen displays
- [ ] OTP request works
- [ ] OTP verification works
- [ ] Trial activation works
- [ ] Exchange API key entry works
- [ ] Market scanning works
- [ ] Signals display correctly
- [ ] Notifications work
- [ ] Sound alerts work
- [ ] Background services run
- [ ] Payment flow works
- [ ] Deep links work

## ProGuard Rules

Ensure `app/proguard-rules.pro` includes:

```proguard
# Keep Retrofit
-keepattributes Signature, InnerClasses, EnclosingMethod
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}

# Keep Room
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *
```

## Troubleshooting

### Build Errors

1. **Gradle sync fails**: Clean and rebuild
```bash
./gradlew clean
./gradlew build
```

2. **Dependency conflicts**: Check versions in `build.gradle.kts`

3. **Kotlin version mismatch**: Update Kotlin version

### Runtime Errors

1. **Network errors**: Check API endpoint configuration
2. **OTP not received**: Verify Twilio credentials
3. **Payment fails**: Check Cashfree configuration

## Release Checklist

- [ ] API endpoint configured
- [ ] Cashfree credentials added
- [ ] App signed with release key
- [ ] ProGuard rules configured
- [ ] Version code incremented
- [ ] Version name updated
- [ ] Release notes prepared
- [ ] Screenshots prepared
- [ ] Privacy policy URL added
- [ ] Terms of service URL added

---

**Last Updated**: $(date)

