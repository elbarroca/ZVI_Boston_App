# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm start` - Start the Expo development server
- `npm run web` - Start the web development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator

### Code Quality
- `npm run lint` - Run ESLint with auto-fix

## Architecture

### App Structure
This is a React Native/Expo app using TypeScript with the following architecture:

- **Routing**: Expo Router with file-based routing
  - `app/(auth)/` - Authentication screens 
  - `app/(tabs)/` - Main app tabs (index, listings, map, saved, settings)
- **State Management**: React Context + TanStack Query for server state
- **Backend**: Supabase (authentication, database, real-time)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Forms**: React Hook Form with Zod validation

### Key Directories
- `app/` - File-based routing screens
- `components/` - Reusable UI components and app-specific components
- `context/` - React context providers (auth, theme, language)
- `lib/` - Utilities, API client, and shared logic
- `config/` - Configuration files (Supabase setup)
- `constants/` - Theme constants and translations

### Authentication Flow
The app uses a gatekeeper pattern in `app/_layout.tsx`:
- `SupabaseProvider` manages auth state with session persistence
- `InitialLayout` component redirects users based on auth state
- OAuth callback handling for web authentication
- Automatic retry mechanism for loading issues

### Database Integration
- All API functions are in `lib/api.ts`
- Supabase client configured in `config/supabase.ts` with PKCE flow
- Real-time subscriptions and automatic token refresh
- Row Level Security (RLS) policies enforced

### UI System
- Custom design system in `components/primitives/` and `components/ui/`
- Theme system with dark mode support via context
- Consistent typography and spacing from `constants/theme.ts`
- Form components with built-in validation

### Map Integration
- Google Maps integration for listings display
- Location permissions configured in `app.json`
- Coordinate handling for property locations

### Key Features
- User authentication (email/Google OAuth)
- Property listings with filtering and search
- Interactive maps with property markers
- Tour request system with calendar integration
- Saved listings functionality
- Multi-language support

### Environment Requirements
Required environment variables:
- `EXPO_PUBLIC_API_URL` - Supabase project URL
- `EXPO_PUBLIC_API_KEY` - Supabase anon key

### Development Notes
- Uses Expo Router with typed routes enabled
- Package scheme: `com.zvi.studenthousing`
- Google Services configured for Android
- Deep linking support with multiple URL schemes
- Image caching and optimization utilities in `lib/utils.ts`