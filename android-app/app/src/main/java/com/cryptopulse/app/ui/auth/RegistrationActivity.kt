package com.cryptopulse.app.ui.auth

import android.content.Intent
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.Editable
import android.text.TextWatcher
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
    private var hasNavigatedToMain = false
    private var isRegisterMode = false

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
        setupInputWatchers()
        updateUiForMode()
    }

    override fun onResume() {
        super.onResume()
        maybeNavigateToMainIfSessionActive()
    }

    private fun setupObservers() {
        viewModel.loginSuccess.observe(this) { success ->
            if (success) {
                showStatus(getString(R.string.auth_login_success_message), isError = false)
                navigateToMain()
                viewModel.clearSuccess()
            }
        }

        viewModel.error.observe(this) { error ->
            if (error.isNullOrBlank()) {
                hideStatus()
            } else {
                showStatus(error, isError = true)
                Toast.makeText(this, error, Toast.LENGTH_SHORT).show()
                viewModel.consumeError()
            }
        }

        viewModel.isLoading.observe(this) { loading ->
            binding.progressBar.visibility = if (loading) View.VISIBLE else View.GONE
            binding.btnPrimaryAction.isEnabled = !loading
            binding.btnToggleMode.isEnabled = !loading
            binding.etEmail.isEnabled = !loading
            binding.etPassword.isEnabled = !loading
            binding.etConfirmPassword.isEnabled = !loading && isRegisterMode
        }
    }

    private fun setupClickListeners() {
        binding.btnPrimaryAction.setOnClickListener {
            hideStatus()
            val email = binding.etEmail.text.toString()
            val password = binding.etPassword.text.toString()
            val confirmPassword = binding.etConfirmPassword.text.toString()

            if (isRegisterMode && password != confirmPassword) {
                showStatus(getString(R.string.auth_error_password_mismatch), isError = true)
                return@setOnClickListener
            }

            viewModel.authenticate(
                email = email,
                password = password,
                createAccount = isRegisterMode
            )
        }

        binding.btnToggleMode.setOnClickListener {
            hideStatus()
            isRegisterMode = !isRegisterMode
            updateUiForMode()
        }
    }

    private fun setupInputWatchers() {
        binding.etEmail.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                hideStatus()
            }
        })

        binding.etPassword.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                hideStatus()
            }
        })

        binding.etConfirmPassword.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                hideStatus()
            }
        })
    }

    private fun updateUiForMode() {
        if (isRegisterMode) {
            binding.titleText.text = getString(R.string.auth_create_account)
            binding.subtitleText.text = getString(R.string.auth_email_subheading)
            binding.btnPrimaryAction.text = getString(R.string.auth_create_account)
            binding.btnToggleMode.text = getString(R.string.auth_switch_to_sign_in)
            binding.confirmPasswordGroup.visibility = View.VISIBLE
        } else {
            binding.titleText.text = getString(R.string.auth_email_heading)
            binding.subtitleText.text = getString(R.string.auth_email_subheading)
            binding.btnPrimaryAction.text = getString(R.string.auth_sign_in)
            binding.btnToggleMode.text = getString(R.string.auth_switch_to_register)
            binding.confirmPasswordGroup.visibility = View.GONE
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
    }

    private fun hideStatus() {
        binding.statusContainer.visibility = View.GONE
    }

    private fun maybeNavigateToMainIfSessionActive() {
        if (hasNavigatedToMain) return

        val isLoggedIn = preferenceManager.getBoolean(KEY_IS_LOGGED_IN, false)
        val token = preferenceManager.getString(KEY_AUTH_TOKEN, "")
        if (isLoggedIn && token.isNotEmpty()) {
            showStatus(getString(R.string.auth_existing_session_message), isError = false)
            binding.progressBar.visibility = View.VISIBLE
            binding.btnPrimaryAction.isEnabled = false
            binding.btnToggleMode.isEnabled = false
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

    companion object {
        private const val EXISTING_SESSION_REDIRECT_DELAY = 650L
        private const val KEY_IS_LOGGED_IN = "is_logged_in"
        private const val KEY_AUTH_TOKEN = "auth_token"
    }
}
