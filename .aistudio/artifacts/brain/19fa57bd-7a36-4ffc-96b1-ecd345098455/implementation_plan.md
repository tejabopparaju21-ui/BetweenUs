# Implementation Plan: Personalized Google Login & Custom Couple Code Pairing

Transition BetweenUs from hardcoded default demo profiles (Teja & Akhila) into a true multi-tenant couple app where every user signs in with their own Gmail/Google account, pairs with their partner using custom couple codes, and sees their own real names and private data.

## Proposed Changes

### 1. Dedicated Authentication & Welcome Screen (`src/components/AuthScreen.tsx`)
- Create a modern, welcoming sign-in screen shown when a user is not authenticated.
- **Primary CTA**: "Sign in with Google" button with instant popup/redirect authentication.
- **Secondary Option**: Email & password login / registration for users who prefer credentials.
- **Demo Option**: "Explore Sample Couple (Demo Mode)" for previewing without logging in.

### 2. Couple Linking & Onboarding View (`src/components/CoupleLinkingModal.tsx` & in-app banner)
- Displayed when a user is signed in with Google but hasn't linked with their partner yet:
  - **Your Couple Code**: Generates and displays their unique 6-character code (e.g. `PAIR-9482` or `LOVE-XXXX`) with a "Copy Code" and "Share via WhatsApp" button.
  - **Enter Partner's Code**: An input field to enter their partner's code and click "Connect & Pair".
  - Either partner entering the other's code links both accounts into an exclusive `couples/{coupleId}` document in Firestore.
  - Once linked, real-time listeners automatically switch the app into their private shared haven.

### 3. User Profile & Data Isolation (`src/context/AppContext.tsx` & `src/lib/firestoreService.ts`)
- **Dynamic Names & Avatars**:
  - Automatically populate current user's profile with their Google account name, email, and Google avatar image.
  - When paired, dynamically load partner's real name, email, and avatar from Firestore.
  - Couple title automatically renders `"${currentUser.name} & ${partnerUser.name}"` instead of "Teja & Akhila".
- **Firestore Schema Scoping**:
  - `users/{uid}` stores each user's profile, city, anniversary, and their `activeCoupleId` or `partnerCode`.
  - `couples/{coupleId}` stores partner UIDs, real names, anniversary, and reunion dates.
  - Messages, memories, moods, and notes are strictly query-filtered by the user's active `couple.id`.
- **Clean Fallback**: Only fallback to Teja & Akhila when explicitly running in Demo Mode.

### 4. Settings & Account Management (`src/components/SettingsSection.tsx` & `Navigation.tsx`)
- Display the authenticated Google account badge, current partner connection status, and personal couple code in Settings.
- Provide a "Switch Partner / Unlink" and "Sign Out" option so partners can manage their connection.

## Verification Plan

### Automated Verification
1. Run `lint_applet` (`npm run lint`) to confirm zero TypeScript compilation errors.
2. Run `compile_applet` (`npm run build`) to ensure the Vite production bundle builds successfully.

### Manual Verification
1. Verify the sign-in screen appears on first visit with the Google sign-in button.
2. Test Google authentication flow and ensure the user's real name and email are loaded.
3. Test couple pairing: generate a code for User 1, enter it as User 2, and verify that both users are linked to the same private couple space with their own names.
4. Verify chat, moods, and memories are cleanly scoped to the new couple without seeing Teja & Akhila sample messages.
