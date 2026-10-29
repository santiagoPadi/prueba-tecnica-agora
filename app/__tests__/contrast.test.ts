import { contrastRatio } from '../src/theme/contrast';
import { brand, palette } from '../src/theme/tokens';

describe('legible bajo el sol: contraste de las parejas donde van cifras', () => {
  it('cifras sobre la tarjeta héroe (verde y naranja claro sobre azul marino) superan 7:1', () => {
    expect(contrastRatio(brand.greenBright, brand.navy)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(brand.orangeLight, brand.navy)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(brand.white, brand.navy)).toBeGreaterThanOrEqual(7);
  });

  it('texto base, montos y texto sobre lavanda superan 7:1; el botón principal (texto grande en negrita) supera 3:1', () => {
    expect(contrastRatio(palette.text, palette.card)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(palette.text, palette.bg)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(palette.infoText, palette.info)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(palette.primaryBtnText, palette.primaryBtn)).toBeGreaterThanOrEqual(3);
  });
});
