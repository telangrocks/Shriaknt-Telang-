package com.cryptopulse.app.ui.auth

import android.content.Intent
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.ViewModelProvider
import com.cryptopulse.app.R
import com.cryptopulse.app.databinding.ActivityRegistrationBinding
import com.cryptopulse.app.ui.main.MainActivity
import com.cryptopulse.app.utils.PreferenceManager
import com.cryptopulse.app.viewmodel.AuthViewModel

class RegistrationActivity : AppCompatActivity() {

    private lateinit var binding: ActivityRegistrationBinding
    private lateinit var viewModel: AuthViewModel
    private val preferenceManager by lazy { PreferenceManager(this) }
    private var lastTriggeredAction: TriggeredAction = TriggeredAction.RequestOtp
    private var hasNavigatedToMain = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityRegistrationBinding.inflate(layoutInflater)
        setContentView(binding.root)

        viewModel = ViewModelProvider(
            this,
            ViewModelProvider.AndroidViewModelFactory.getInstance(application)
        )[AuthViewModel::class.java]

        setupObservers()
        setupClickListeners()
    }

    override fun onResume() {
        super.onResume()
        maybeNavigateToMainIfSessionActive()
    }

    private fun setupObservers() {
        viewModel.otpSent.observe(this) { sent ->
            if (sent) {
                binding.otpLayout.visibility = View.VISIBLE
                binding.btnRequestOtp.text = getString(R.string.auth_request_button)
                showStatus(getString(R.string.auth_otp_sent_message), isError = false)
                viewModel.consumeOtpSent()
            }
        }

        viewModel.otpMessage.observe(this) { message ->
            message?.let {
                showStatus(it, isError = false)
                Toast.makeText(this, it, Toast.LENGTH_SHORT).show()
                viewModel.consumeOtpMessage()
            }
        }

        viewModel.loginSuccess.observe(this) { success ->
            if (success) {
                showStatus(getString(R.string.auth_login_success_message), isError = false)
                navigateToMain()
            }
        }

        viewModel.error.observe(this) { error ->
            if (error.isNullOrBlank()) {
                hideStatus()
            } else {
                showStatus(error, isError = true)
                Toast.makeText(this, error, Toast.LENGTH_SHORT).show()
            }
        }

        viewModel.isLoading.observe(this) { loading ->
            binding.progressBar.visibility = if (loading) View.VISIBLE else View.GONE
            binding.btnRequestOtp.isEnabled = !loading
            binding.btnVerifyOtp.isEnabled = !loading
            binding.btnRetry.isEnabled = !loading
            binding.etPhone.isEnabled = !loading
            binding.etOtp.isEnabled = !loading
            if (loading) {
                when (lastTriggeredAction) {
                    TriggeredAction.RequestOtp -> {
                        binding.btnRequestOtp.text = getString(R.string.auth_requesting_otp)
                        binding.btnVerifyOtp.text = getString(R.string.auth_verify_button)
                    }
                    TriggeredAction.VerifyOtp -> {
                        binding.btnVerifyOtp.text = getString(R.string.auth_verifying_otp)
                        binding.btnRequestOtp.text = getString(R.string.auth_request_button)
                    }
                }
            } else {
                binding.btnRequestOtp.text = getString(R.string.auth_request_button)
                binding.btnVerifyOtp.text = getString(R.string.auth_verify_button)
            }
        }
    }

    private fun setupClickListeners() {
        binding.btnRequestOtp.setOnClickListener {
            hideStatus()
            lastTriggeredAction = TriggeredAction.RequestOtp
            val phone = binding.etPhone.text.toString()
            viewModel.requestOTP(this, phone)
        }

        binding.btnVerifyOtp.setOnClickListener {
            hideStatus()
            lastTriggeredAction = TriggeredAction.VerifyOtp
            val otp = binding.etOtp.text.toString()
            viewModel.verifyOTP(otp)
        }

        binding.btnRetry.setOnClickListener {
            hideStatus()
            viewModel.retryLastAction(this)
        }
    }

    private fun showStatus(message: String, isError: Boolean) {
        val container = binding.statusContainer
        val textView = binding.statusText

        val background = container.background?.mutate() ?: ContextCompat.getDrawable(
            this,
            R.drawable.bg_status_container
        )?.mutate()

        if (background is GradientDrawable) {
            val color = if (isError) {
                ContextCompat.getColor(this, R.color.brand_error)
            } else {
                ContextCompat.getColor(this, R.color.brand_primary_variant)
            }
            background.setColor(color)
        }

        container.background = background
        textView.text = message
        container.visibility = View.VISIBLE
        binding.btnRetry.visibility = if (isError) View.VISIBLE else View.GONE
    }

    private fun hideStatus() {
        binding.statusContainer.visibility = View.GONE
        binding.btnRetry.visibility = View.GONE
    }

    private fun maybeNavigateToMainIfSessionActive() {
        if (hasNavigatedToMain) return

        val isLoggedIn = preferenceManager.getBoolean(KEY_IS_LOGGED_IN, false)
        val token = preferenceManager.getString(KEY_AUTH_TOKEN, "")
        if (isLoggedIn && token.isNotEmpty()) {
            showStatus(getString(R.string.auth_existing_session_message), isError = false)
            binding.progressBar.visibility = View.VISIBLE
            binding.btnRequestOtp.isEnabled = false
            binding.btnVerifyOtp.isEnabled = false
            binding.btnRetry.visibility = View.GONE
            Handler(Looper.getMainLooper()).postDelayed({
                navigateToMain()
            }, EXISTING_SESSION_REDIRECT_DELAY)
        }
    }

    private fun navigateToMain() {
        if (hasNavigatedToMain) return

        hasNavigatedToMain = true
        startActivity(
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
            }
        )
        finish()
    }

    private enum class TriggeredAction {
        RequestOtp,
        VerifyOtp
    }

    companion object {
        private const val EXISTING_SESSION_REDIRECT_DELAY = 650L
        private const val KEY_IS_LOGGED_IN = "is_logged_in"
        private const val KEY_AUTH_TOKEN = "auth_token"
    }
}


