import { Amplify } from 'aws-amplify'
import {
  confirmSignIn,
  fetchAuthSession,
  getCurrentUser,
  signIn,
  signOut,
} from 'aws-amplify/auth'

const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID
const userPoolClientId = import.meta.env.VITE_COGNITO_CLIENT_ID
const eventEndpoint = import.meta.env.VITE_APPSYNC_EVENT_ENDPOINT
const eventRegion = import.meta.env.VITE_APPSYNC_EVENT_REGION || 'ap-southeast-2'
const eventAuthMode = import.meta.env.VITE_APPSYNC_EVENT_AUTH_MODE || 'userPool'
const eventApiKey = import.meta.env.VITE_APPSYNC_EVENT_API_KEY

let isConfigured = false

export function configureAmplify() {
  if (isConfigured) return

  if (!userPoolId || !userPoolClientId) {
    throw new Error(
      'Amplify Auth is not configured. Add VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID to .env.',
    )
  }

  const config = {
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith: {
          email: true,
        },
      },
    },
  }

  if (eventEndpoint) {
    config.API = {
      Events: {
        endpoint: eventEndpoint,
        region: eventRegion,
        defaultAuthMode: eventAuthMode,
        ...(eventApiKey ? { apiKey: eventApiKey } : {}),
      },
    }
  }

  Amplify.configure(config)

  isConfigured = true
}

export async function signInWithAmplify(email, password) {
  configureAmplify()

  return signIn({
    username: email,
    password,
  })
}

export async function confirmAmplifySignIn(challengeResponse) {
  configureAmplify()
  return confirmSignIn({ challengeResponse })
}

export async function getAmplifySession() {
  configureAmplify()
  return fetchAuthSession()
}

export async function getAmplifyUser() {
  configureAmplify()
  return getCurrentUser()
}

export async function signOutWithAmplify() {
  configureAmplify()
  return signOut()
}

export function getSignInStepMessage(nextStep) {
  const step = nextStep?.signInStep

  const messages = {
    CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED:
      'A new password is required before this account can finish signing in.',
    CONFIRM_SIGN_IN_WITH_SMS_CODE:
      'Enter the verification code sent by SMS to finish signing in.',
    CONFIRM_SIGN_IN_WITH_EMAIL_CODE:
      'Enter the verification code sent by email to finish signing in.',
    CONFIRM_SIGN_IN_WITH_TOTP_CODE:
      'Enter the code from your authenticator app to finish signing in.',
    CONTINUE_SIGN_IN_WITH_MFA_SELECTION:
      'Choose an MFA method to finish signing in.',
    CONTINUE_SIGN_IN_WITH_MFA_SETUP_SELECTION:
      'Set up an MFA method to finish signing in.',
    CONTINUE_SIGN_IN_WITH_FIRST_FACTOR_SELECTION:
      'Choose a sign-in method to continue.',
    CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE:
      'A custom authentication challenge is required to finish signing in.',
  }

  return messages[step] || `Additional sign-in step required: ${step || 'unknown challenge'}.`
}
