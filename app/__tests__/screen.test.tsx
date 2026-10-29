import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { carmenForecastInput } from '../src/engine';
import { CajaScreen } from '../src/screens/CajaScreen';

const at = new Date('2026-05-25T07:02:00-05:00');

async function renderScreen(startOnline = true) {
  const openUrl = jest.fn();
  const screen = await render(<CajaScreen input={carmenForecastInput()} confirmedAt={at} fontsReady={false} startOnline={startOnline} openUrl={openUrl} />);
  return { screen, openUrl };
}

describe('Pantalla «Caja a 14 días» con los datos de Carmen', () => {
  it('responde primero: No, el sábado 30 faltan $136.000; y de qué cobro depende el viernes', async () => {
    const { screen } = await renderScreen();
    expect(screen.getByTestId('hero-answer').props.children).toBe('No');
    expect(screen.getByText('El sábado 30 de mayo te faltan $136.000 para el pago de tus ayudantes.')).toBeTruthy();
    expect(screen.getByText(/El viernes 29 de mayo alcanza solo si Hotel Brisas paga el jue 28 may; sin ese cobro faltarían \$1\.162\.000\./)).toBeTruthy();
    expect(screen.getByText('$6.900.000')).toBeTruthy();
  });

  it('muestra la certeza en lenguaje cotidiano y sus razones al tocarla', async () => {
    const { screen } = await renderScreen();
    expect(screen.getByText('Certeza media: 1 dato por confirmar')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('certainty-toggle'));
    expect(screen.getByText(/Registras en Necta cerca del 25%/)).toBeTruthy();
    expect(screen.getByText(/\$260\.000 que no cuadran/)).toBeTruthy();
  });

  it('muestra tres acciones: Brisas (asegura el viernes), La Esquina y Doña Fina, con botón de WhatsApp', async () => {
    const { screen, openUrl } = await renderScreen();
    expect(screen.getByText('1. Hotel Brisas')).toBeTruthy();
    expect(screen.getByText('2. Tienda La Esquina')).toBeTruthy();
    expect(screen.getByText('3. Tienda Doña Fina')).toBeTruthy();
    expect(screen.queryByText('4. las otras 9 tiendas (primera semana)')).toBeNull();
    expect(screen.getByText('Asegura el viernes')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('whatsapp-1'));
    expect(openUrl).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/wa\.me\/\?text=Hola%2C%20Hotel%20Brisas/));
    await fireEvent.press(screen.getByTestId('toggle-all-actions'));
    expect(screen.getByText('7. tu proveedor principal')).toBeTruthy();
  });

  it('sin señal muestra la hora del último pronóstico y un abono se aplica al instante como pendiente', async () => {
    const { screen } = await renderScreen(false);
    expect(screen.getByText('Sin señal · pronóstico de las 7:02 a. m.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('toggle-all-actions'));
    await fireEvent.press(screen.getByTestId('register-rec_minimercado_sol'));
    await fireEvent.changeText(screen.getByTestId('payment-amount'), '300000');
    await fireEvent.press(screen.getByTestId('payment-save'));
    expect(screen.getByText('El lunes 1 de junio te faltan $1.018.000 para el arriendo de la bodega.')).toBeTruthy();
    expect(screen.getByText('Pendiente de sincronizar · 1 movimiento')).toBeTruthy();
  });

  it('un abono mayor al pendiente no se guarda y explica por qué', async () => {
    const { screen } = await renderScreen(false);
    await fireEvent.press(screen.getByTestId('toggle-all-actions'));
    await fireEvent.press(screen.getByTestId('register-rec_minimercado_sol'));
    await fireEvent.changeText(screen.getByTestId('payment-amount'), '9000000');
    await fireEvent.press(screen.getByTestId('payment-save'));
    expect(screen.getByTestId('payment-error').props.children).toMatch(/pendientes/);
  });

  it('al volver la señal, el abono pendiente se sincroniza y el titular no cambia', async () => {
    jest.useFakeTimers();
    const { screen } = await renderScreen(false);
    await fireEvent.press(screen.getByTestId('toggle-all-actions'));
    await fireEvent.press(screen.getByTestId('register-rec_minimercado_sol'));
    await fireEvent.changeText(screen.getByTestId('payment-amount'), '300000');
    await fireEvent.press(screen.getByTestId('payment-save'));
    await fireEvent(screen.getByTestId('demo-offline'), 'valueChange', false);
    await act(async () => { jest.advanceTimersByTime(1200); });
    expect(screen.getByText('Abono guardado')).toBeTruthy();
    expect(screen.queryByText(/Pendiente de sincronizar/)).toBeNull();
    expect(screen.getByText('El lunes 1 de junio te faltan $1.018.000 para el arriendo de la bodega.')).toBeTruthy();
    jest.useRealTimers();
  });

  it('cuadrar la caja en un toque quita el dato por confirmar', async () => {
    const { screen } = await renderScreen(false);
    await fireEvent.press(screen.getByTestId('reconcile-link'));
    expect(screen.queryByText('Certeza media: 1 dato por confirmar')).toBeNull();
    expect(screen.getByText('Certeza media')).toBeTruthy();
    expect(screen.getByText('El lunes 1 de junio te faltan $1.058.000 para el arriendo de la bodega.')).toBeTruthy();
  });
});
