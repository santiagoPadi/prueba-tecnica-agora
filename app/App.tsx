import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold, useFonts } from '@expo-google-fonts/manrope';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { carmenForecastInput } from './src/engine';
import { CajaScreen } from './src/screens/CajaScreen';

/** Lunes 25 de mayo de 2026, 7:02 a. m. en Barranquilla: el último pronóstico confirmado por el servidor. */
const CONFIRMED_AT = new Date('2026-05-25T07:02:00-05:00');

export default function App() {
  const [fontsReady] = useFonts({ Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <CajaScreen input={carmenForecastInput()} confirmedAt={CONFIRMED_AT} fontsReady={fontsReady} />
    </SafeAreaProvider>
  );
}
