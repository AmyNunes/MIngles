import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { FlashCard } from '../FlashCard';

describe('FlashCard', () => {
  it('antes de virar, só a frente está acessível', async () => {
    await render(
      <FlashCard flipped={false} height={300} front={<Text>frente</Text>} back={<Text>verso</Text>} />,
    );
    expect(screen.getByText('frente')).toBeOnTheScreen();
    expect(screen.queryByText('verso')).toBeNull();
  });

  it('virado, mostra o verso e esconde a frente do leitor de tela', async () => {
    const { rerender } = await render(
      <FlashCard flipped={false} height={300} front={<Text>frente</Text>} back={<Text>verso</Text>} />,
    );
    await rerender(<FlashCard flipped height={300} front={<Text>frente</Text>} back={<Text>verso</Text>} />);

    expect(screen.getByText('verso')).toBeOnTheScreen();
    expect(screen.queryByText('frente')).toBeNull();
  });
});
