package com.cryptopulse.app.ui.splash

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.appcompat.app.AppCompatActivity
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.cryptopulse.app.R
import com.cryptopulse.app.ui.auth.RegistrationActivity

class SplashActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)

        Handler(Looper.getMainLooper()).postDelayed({
            startActivity(Intent(this, RegistrationActivity::class.java))
            finish()
        }, SPLASH_DELAY_MILLIS)
    }

    companion object {
        private const val SPLASH_DELAY_MILLIS = 1500L
    }
}

