import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';

describe('Selah Bible Sanctuary App UI', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders Sanctuary dashboard, loads sample journey, and navigates all views', async () => {
    render(<App />);

    expect(await screen.findByText(/Canonical Journey/i)).toBeInTheDocument();

    const previewBtn = screen.getByRole('button', { name: /Preview Sample Journey/i });
    fireEvent.click(previewBtn);

    await waitFor(() => {
      expect(screen.getByText(/12d streak|days streak/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Books & Chapters/i }));
    expect(await screen.findByText(/Scripture Library/i)).toBeInTheDocument();
    expect(screen.getByText('Genesis')).toBeInTheDocument();

    const search = screen.getByLabelText(/Search Bible books/i);
    fireEvent.change(search, { target: { value: 'Psalms' } });
    expect(screen.getByText('Psalms')).toBeInTheDocument();
    expect(screen.queryByText('Revelation')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Hall of Seals/i }));
    expect(await screen.findByText(/Illuminated Hall of Seals/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Journal & Plans/i }));
    expect(await screen.findByText(/Reading Journal/i)).toBeInTheDocument();
  });

  it('logs a chapter via Quick Log, unlocks Open the Scroll seal, and opens Book chapter grid', async () => {
    render(<App />);
    expect(await screen.findByText(/Canonical Journey/i)).toBeInTheDocument();

    const quickLogBtn = screen.getByRole('button', { name: /Quick Log: John 1/i });
    fireEvent.click(quickLogBtn);

    await waitFor(() => {
      expect(screen.getByText(/1 \/ 1,189 chapters/i)).toBeInTheDocument();
    });

    expect(await screen.findByText(/^Open the Scroll$/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Open John chapter grid/i }));
    expect(await screen.findByRole('heading', { name: 'John' })).toBeInTheDocument();

    const ch2Btn = screen.getByRole('button', { name: /^2$/ });
    fireEvent.click(ch2Btn);

    await waitFor(() => {
      expect(screen.getByText(/2 of 21 chapters read \(10%\)/i)).toBeInTheDocument();
    });
  });

  it('switches color scheme inside Settings modal', async () => {
    render(<App />);
    expect(await screen.findByText(/Canonical Journey/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Open settings/i }));
    expect(await screen.findByText(/Sanctuary Settings/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Vesper Candlelight/i }));
    expect(
      document.querySelector('meta[name="color-scheme"]')?.getAttribute('content')
    ).toBe('dark');
    expect(localStorage.getItem('selah-color-scheme')).toBe('dark');
  });
});
