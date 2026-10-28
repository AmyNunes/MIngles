import { fireEvent, render, screen } from '@testing-library/react-native';

import { strings } from '@/i18n/strings';

import { EmptyState } from '../EmptyState';
import { ErrorState } from '../ErrorState';
import { Skeleton } from '../Skeleton';
import { Text } from '../Text';

describe('EmptyState', () => {
  it('mostra a frase e a ação', async () => {
    const onPress = jest.fn();
    await render(
      <EmptyState icon="book-open" message="Nenhum texto ainda." action={{ label: 'Colar', onPress }} />,
    );

    expect(screen.getByText('Nenhum texto ainda.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Colar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('funciona sem ação', async () => {
    await render(<EmptyState icon="book-open" message="Nada por aqui." />);

    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('ErrorState', () => {
  it('"Tentar de novo" chama onRetry', async () => {
    const onRetry = jest.fn();
    await render(<ErrorState onRetry={onRetry} />);

    expect(screen.getByText(strings.common.genericError)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: strings.common.retry }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('Skeleton', () => {
  it('renderiza sem quebrar (reanimated nos testes)', async () => {
    await render(<Skeleton height={20} />);
  });
});

describe('Text', () => {
  it('limita a escala de fonte do sistema a 130%', async () => {
    await render(<Text>Olá</Text>);

    expect(screen.getByText('Olá')).toHaveProp('maxFontSizeMultiplier', 1.3);
  });
});
