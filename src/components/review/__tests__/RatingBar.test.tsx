import { fireEvent, render, screen } from '@testing-library/react-native';

import { newSchedulingState, previewRatings } from '@/srs/fsrs';

import { RatingBar } from '../RatingBar';

const now = new Date('2026-10-20T12:00:00.000Z');

describe('RatingBar', () => {
  it('mostra os 4 botões com o intervalo previsto pelo FSRS', async () => {
    const preview = previewRatings(newSchedulingState(now), now, 0.9);
    await render(<RatingBar preview={preview} onRate={() => {}} />);

    for (const label of ['Errei', 'Difícil', 'Bom', 'Fácil']) {
      expect(screen.getByText(label)).toBeOnTheScreen();
    }
    expect(screen.getByText(preview.again.interval)).toBeOnTheScreen();
    expect(screen.getByText(preview.easy.interval)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: `Bom, volta em ${preview.good.interval}` })).toBeOnTheScreen();
  });

  it('avisa a avaliação tocada', async () => {
    const onRate = jest.fn();
    const preview = previewRatings(newSchedulingState(now), now, 0.9);
    await render(<RatingBar preview={preview} onRate={onRate} />);

    await fireEvent.press(screen.getByText('Fácil'));

    expect(onRate).toHaveBeenCalledWith('easy');
  });
});
