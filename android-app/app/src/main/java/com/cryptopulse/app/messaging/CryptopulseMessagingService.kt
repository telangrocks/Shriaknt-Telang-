package com.cryptopulse.app.messaging

import android.app.NotificationManager
import android.content.Context
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.cryptopulse.app.CryptopulseApplication
import com.cryptopulse.app.R
import com.cryptopulse.app.repository.AuthRepository
import com.cryptopulse.app.utils.PreferenceManager
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlin.random.Random

class CryptopulseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        val preferenceManager = PreferenceManager(applicationContext)
        preferenceManager.putString(KEY_DEVICE_TOKEN, token)

        val isLoggedIn = preferenceManager.getBoolean(KEY_IS_LOGGED_IN, false)
        if (!isLoggedIn) {
            return
        }

        CoroutineScope(Dispatchers.IO).launch {
            runCatching {
                AuthRepository(applicationContext).registerDeviceToken(token)
            }
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)

        val title = message.notification?.title ?: getString(R.string.app_name)
        val body = message.notification?.body ?: "You have a new update from Cryptopulse."

        val notification = NotificationCompat.Builder(
            this,
            CryptopulseApplication.NOTIFICATION_CHANNEL_SIGNALS
        )
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()

        val notificationManager =
            getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (NotificationManagerCompat.from(this).areNotificationsEnabled()) {
            notificationManager.notify(Random.nextInt(), notification)
        }
    }

    companion object {
        private const val KEY_DEVICE_TOKEN = "device_token"
        private const val KEY_IS_LOGGED_IN = "is_logged_in"
    }
}


