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

### Testing and Building
- Test database connection functions are available in `lib/api.ts` (testTourRequestDatabase)
- No test framework currently configured - check with team before adding tests

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
- Service layer includes specialized modules:
  - `lib/tourService.ts` - Tour request handling and calendar integration
  - `lib/auth.ts` - Authentication utilities
  - `lib/calendarService.ts` - Native calendar integration
  - `lib/neighborhoods.ts` - Location and neighborhood data

### UI System
- Custom design system in `components/primitives/` and `components/ui/`
- Theme system with dark mode support via context
- Consistent typography and spacing from `constants/theme.ts`
- Form components with built-in validation
- **Modal Pattern**: Use structured overlay approach to prevent split backgrounds:
  - `modalOverlay` with `flex: 1, justifyContent: 'center', alignItems: 'center'`
  - `modalBackdrop` with `position: 'absolute'` for tap handling
  - Modal content with proper `zIndex` and responsive sizing
- **Tour Request UI**: Enhanced with emojis, priority indicators, and improved visual hierarchy

### Map Integration
- Google Maps integration for listings display
- Location permissions configured in `app.json`
- Coordinate handling for property locations

### Key Features
- User authentication (email/Google OAuth, Apple Sign-In)
- Property listings with advanced filtering system:
  - Price range, bedrooms, laundry type, parking
  - Boolean filters (pets, furnished, utilities, broker fee)
  - Neighborhood-based filtering with multiple selection
  - Filter persistence using AsyncStorage
- Interactive maps with property markers and Google Maps integration
- Tour request system with calendar integration and priority scheduling
- Saved listings functionality with user-specific state
- **Multi-language support**: Comprehensive i18n system with context-aware translations
  - Language selection modal with native names and flags
  - Real-time language switching without app restart
  - Translation keys in `constants/translations.ts`
  - Support for international phone number validation
- Account management including account deletion with data cleanup

### Environment Requirements
Required environment variables:
- `EXPO_PUBLIC_API_URL` - Supabase project URL
- `EXPO_PUBLIC_API_KEY` - Supabase anon key

### Development Notes
- Uses Expo Router with typed routes enabled
- Package scheme: `com.zentro.studenthousing`
- Google Services configured for Android with API keys in app.json
- Deep linking support with multiple URL schemes (zentro, exp+zentro, com.zentro.studenthousing)
- Image caching and optimization utilities in `lib/utils.ts`
- Calendar integration for tour requests with native calendar API
- Location permissions configured for map functionality

### Code Standards
Following .cursor rules:
- Use functional components with hooks over class components
- Component modularity - break into smaller, reusable pieces
- Organize files by feature when possible
- Use camelCase for variables/functions, PascalCase for components
- Optimize FlatList performance with removeClippedSubviews, maxToRenderPerBatch, windowSize
- Use StyleSheet.create() for consistent styling
- Avoid anonymous functions in render callbacks and renderItem
- Minimize global variables and use ES6+ features
- Use React.memo() for performance optimization
- Optimize image handling with react-native-fast-image patterns

### Tour Request System
- **Multi-Property Tours**: Users can select up to 4 additional properties per tour request
- **Smart Filtering**: Already requested listings are automatically filtered out using `TourService.getAlreadyRequestedListingIds()`
- **Priority Time Slots**: Users can select up to 3 time slots with visual priority indicators (star for #1 choice)
- **Advanced Validation**: Prevents duplicate requests and validates time slot conflicts
- **Enhanced Confirmation UI**: Displays time slots with contextual emojis and proper formatting
- **Calendar Integration**: Native calendar API integration for confirmed tours
- **Multi-contact Support**: Email, phone, or both contact methods with international phone validation
- **Real-time Status Tracking**: Pending → Confirmed → Contacted → Completed workflow

### Development Priorities
Based on .cursor rules feedback and recent implementations:

**Completed Recently:**
- ✅ Enhanced tour request UI with priority indicators and emoji time slots
- ✅ Multi-property tour selection with smart filtering
- ✅ Modal system improvements (proper overlay structure)
- ✅ Comprehensive translation system with language switching
- ✅ Account deletion with proper modal UX

**Current Priorities:**
1. **Map Integration**: Campus pins (BU, Northeastern, Harvard) with neighborhood visualization
2. **Media Support**: Video and virtual tour integration for enhanced property viewing
3. **Shared Access**: Non-.edu user access for parents and family members
4. **Calendar Enhancement**: Improved tour request calendar styling and management
5. **Performance**: FlatList optimizations and image caching improvements

**Key Technical Patterns to Follow:**
- Use `TourService` methods for tour-related operations
- Implement modal overlay pattern for consistent UX
- Apply emoji + time formatting for better visual hierarchy
- Use translation keys (`t()`) for all user-facing text
- Follow neighborhood data structure in `lib/neighborhoods.ts`