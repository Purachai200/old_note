<template>
  <div class="modal-overlay">
    <div class="auth-card">
      <div class="auth-header">
        <div class="app-logo-icon" style="margin: 0 auto 10px auto; width: 48px; height: 48px;">
          <svg style="width: 26px; height: 26px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h2 class="auth-title">
          {{ isRegister ? 'Create an Account' : 'Sign in to RealSync' }}
        </h2>
        <p style="font-size: 13px; color: #6b7280; margin-top: 4px;">
          Real-Time Notes & Checklists for Laptop & iPad Mini
        </p>
      </div>

      <div v-if="errorMessage" class="error-banner">
        {{ errorMessage }}
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label class="form-label" for="username">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            class="form-input"
            placeholder="e.g. presenter"
            autocapitalize="none"
            autocorrect="off"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="form-input"
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          class="btn btn-primary btn-block"
          :disabled="loading"
        >
          <span v-if="loading">Processing...</span>
          <span v-else>{{ isRegister ? 'Register & Continue' : 'Sign In' }}</span>
        </button>
      </form>

      <div class="auth-switch-link">
        <span v-if="isRegister">Already have an account?</span>
        <span v-else>Need a new account?</span>
        <button
          type="button"
          class="auth-switch-btn"
          @click="toggleMode"
        >
          {{ isRegister ? 'Sign In' : 'Register' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'LoginModal',
  emits: ['authenticated'],
  data() {
    return {
      isRegister: false,
      username: '',
      password: '',
      loading: false,
      errorMessage: ''
    };
  },
  methods: {
    toggleMode() {
      this.isRegister = !this.isRegister;
      this.errorMessage = '';
    },
    async handleSubmit() {
      this.errorMessage = '';
      this.loading = true;

      const endpoint = this.isRegister ? '/api/auth/register' : '/api/auth/login';

      try {
        const response = await axios.post(endpoint, {
          username: this.username,
          password: this.password
        });

        const { token, user } = response.data;
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
        this.$emit('authenticated', { token, user });
      } catch (err) {
        if (err.response && err.response.data && err.response.data.error) {
          this.errorMessage = err.response.data.error;
        } else {
          this.errorMessage = 'Connection failed. Please check backend server.';
        }
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>
