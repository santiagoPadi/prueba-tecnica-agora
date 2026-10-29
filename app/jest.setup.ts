jest.mock('@expo-google-fonts/manrope', () => ({
  useFonts: () => [true, null],
  Manrope_400Regular: 'Manrope_400Regular',
  Manrope_600SemiBold: 'Manrope_600SemiBold',
  Manrope_700Bold: 'Manrope_700Bold',
  Manrope_800ExtraBold: 'Manrope_800ExtraBold',
}));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
