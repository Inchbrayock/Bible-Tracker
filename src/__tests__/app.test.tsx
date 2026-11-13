import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { formatPlainDate, formatShortDate, todayPlainDate } from '../lib/dates';

vi.setConfig({ testTimeout: 15000 });

function getWholeBibleChapterReadout(chaptersRead: number) {
  return screen.getByText(
    (_, el) => el?.tagName === 'SPAN' && el.textContent?.trim() === `${chaptersRead} / 1,189 ch`
  );
}

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
      expect(screen.getByText(/days streak/i)).toBeInTheDocument();
    });

    const header = document.querySelector('header');
    expect(header).not.toBeNull();
    expect(header?.textContent).not.toMatch(/1,189|134|12d|streak/i);

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

  it('filters Log History entries by book and chapter, note, and displayed date', async () => {
    render(<App />);
    expect(await screen.findByText(/Canonical Journey/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Preview Sample Journey/i }));
    await waitFor(() => {
      expect(screen.getByText(/days streak/i)).toBeInTheDocument();
    });

    const header = document.querySelector('header');
    expect(header).not.toBeNull();
    expect(header?.textContent).not.toMatch(/1,189|134|12d|streak/i);

    fireEvent.click(screen.getByRole('button', { name: /Journal & Plans/i }));
    expect(await screen.findByText(/Reading Journal/i)).toBeInTheDocument();

    const journalSearch = screen.getByLabelText(/Filter reading journal/i);
    fireEvent.change(journalSearch, { target: { value: 'Romans 8' } });
    expect(screen.getByText(/Romans 7–8/i)).toBeInTheDocument();
    expect(screen.queryByText(/Genesis 1–10/i)).not.toBeInTheDocument();

    fireEvent.change(journalSearch, { target: { value: "God's word" } });
    expect(screen.getByText(/Psalms 103, 119, 121, 139/i)).toBeInTheDocument();
    expect(screen.queryByText(/Romans 7–8/i)).not.toBeInTheDocument();

    const todayShort = formatShortDate(todayPlainDate());
    fireEvent.change(journalSearch, { target: { value: todayShort } });
    expect(screen.getByText(/Romans 14–16/i)).toBeInTheDocument();
    expect(screen.queryByText(/Genesis 1–10/i)).not.toBeInTheDocument();

    fireEvent.change(journalSearch, { target: { value: 'zzzz-no-match' } });
    expect(screen.getByText(/No matching entries/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Reset search$/i }));
    expect(screen.getByText(/Genesis 1–10/i)).toBeInTheDocument();
  });

  it('logs a chapter via Quick Log, unlocks Open the Scroll seal, and opens Book chapter grid', async () => {
    render(<App />);
    expect(await screen.findByText(/Canonical Journey/i)).toBeInTheDocument();

    const quickLogBtn = screen.getByRole('button', { name: /Quick Log: John 1/i });
    fireEvent.click(quickLogBtn);

    await waitFor(() => {
      expect(getWholeBibleChapterReadout(1)).toBeInTheDocument();
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

  it('opens dedicated Settings page from profile popover, switches color scheme, and navigates back', async () => {
    render(<App />);
    expect(await screen.findByText(/Canonical Journey/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /Sign in to sync your Sanctuary account/i })
    );
    const popover = await screen.findByTestId('account-popover');
    fireEvent.click(await screen.findByRole('button', { name: /Settings/i }));

    expect(
      await screen.findByRole('heading', { level: 1, name: /Sanctuary Settings/i })
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(popover).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Vesper Candlelight/i }));
    expect(
      document.querySelector('meta[name="color-scheme"]')?.getAttribute('content')
    ).toBe('dark');
    expect(localStorage.getItem('selah-color-scheme')).toBe('dark');

    fireEvent.click(screen.getByRole('button', { name: /Back to Sanctuary/i }));
    expect(await screen.findByText(/Canonical Journey/i)).toBeInTheDocument();
  });

  it('renders 66 proportional canonical book spines and opens book sheets from the bar', async () => {
    render(<App />);
    expect(await screen.findByText(/Canonical Journey/i)).toBeInTheDocument();

    const spineGroup = screen.getByRole('group', { name: /66-book canonical progress bar/i });
    const spineButtons = spineGroup.querySelectorAll('button');
    expect(spineButtons).toHaveLength(66);

    const psalmsSpine = screen.getByRole('button', { name: /Psalms: 0 of 150 chapters read/i });
    fireEvent.mouseEnter(psalmsSpine);
    expect(screen.getByText(/Wisdom & Poetry/i)).toBeInTheDocument();

    fireEvent.click(psalmsSpine);
    expect(await screen.findByRole('heading', { name: 'Psalms' })).toBeInTheDocument();
  });

  it('logs a multi-chapter range via touch-friendly Range tap mode inside BookDetailDialog', async () => {
    render(<App />);
    expect(await screen.findByText(/Canonical Journey/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Open John chapter grid/i }));
    expect(await screen.findByRole('heading', { name: 'John' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Range$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^2$/ }));
    expect(screen.getByText(/Selected Ch\. 2\./i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^5$/ }));

    await waitFor(() => {
      expect(screen.getByText(/4 of 21 chapters read \(19%\)/i)).toBeInTheDocument();
    });
  });

  it('logs the next day of the active reading plan from Sanctuary and opens Reading Plans directly', async () => {
    render(<App />);
    expect(await screen.findByText(/Canonical Journey/i)).toBeInTheDocument();

    expect(screen.getByText(/Gospels & Acts Journey/i)).toBeInTheDocument();
    expect(screen.getByText(/Matthew 1–3/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Log Day 1/i }));

    await waitFor(() => {
      expect(screen.getByText(/1 of 45 days/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Matthew 4–6/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /All plans/i }));
    expect(await screen.findByText(/Guided Reading Plans/i)).toBeInTheDocument();
  });

  it('filters 52-Week Reading Cadence heatmap, summary, and monthly table by year', async () => {
    const today = todayPlainDate();
    const currentYear = Number(today.slice(0, 4));
    const pastYear = currentYear - 2;
    const pastDate = `${pastYear}-06-15`;
    const pastMonth = `${pastYear}-06`;
    const currentMonth = today.slice(0, 7);

    render(<App />);
    expect(await screen.findByText(/Canonical Journey/i)).toBeInTheDocument();

    // Log 3 chapters in a past year via Log a Reading form
    fireEvent.change(screen.getByLabelText(/^Chapters$/i), { target: { value: '1-3' } });
    fireEvent.change(screen.getByLabelText(/^Date read$/i), { target: { value: pastDate } });
    fireEvent.click(screen.getByRole('button', { name: /Log Passage/i }));

    await waitFor(() => {
      expect(getWholeBibleChapterReadout(3)).toBeInTheDocument();
    });

    // Log 1 chapter today via Quick Log
    fireEvent.click(screen.getByRole('button', { name: /Quick Log: John 4/i }));
    await waitFor(() => {
      expect(getWholeBibleChapterReadout(4)).toBeInTheDocument();
    });

    const heatmapSection = screen.getByRole('region', { name: /52-Week Reading Cadence/i });
    const yearFilterGroup = within(heatmapSection).getByRole('group', {
      name: /Filter reading cadence by year/i,
    });

    const rollingBtn = within(yearFilterGroup).getByRole('button', { name: /Last 52 weeks/i });
    const currentYearBtn = within(yearFilterGroup).getByRole('button', {
      name: String(currentYear),
    });
    const pastYearBtn = within(yearFilterGroup).getByRole('button', { name: String(pastYear) });

    // Default rolling 52 weeks excludes the 2-year-old session
    expect(rollingBtn).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(heatmapSection).getByText(/1 active reading day \(1 chapter\)/i)
    ).toBeInTheDocument();

    // Open Monthly summary table and verify rolling view shows currentMonth only
    fireEvent.click(within(heatmapSection).getByRole('button', { name: /Monthly summary table/i }));
    expect(await within(heatmapSection).findByText(currentMonth)).toBeInTheDocument();
    expect(within(heatmapSection).queryByText(pastMonth)).not.toBeInTheDocument();

    // Switch to pastYear
    fireEvent.click(pastYearBtn);
    expect(pastYearBtn).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(heatmapSection).getByRole('grid', {
        name: new RegExp(`${pastYear} Bible reading activity`, 'i'),
      })
    ).toBeInTheDocument();
    expect(
      within(heatmapSection).getByText(
        new RegExp(`In ${pastYear}: 1 active reading day \\(3 chapters\\)`, 'i')
      )
    ).toBeInTheDocument();
    expect(within(heatmapSection).getByText(pastMonth)).toBeInTheDocument();
    expect(within(heatmapSection).queryByText(currentMonth)).not.toBeInTheDocument();

    const pastSquare = within(heatmapSection).getByRole('button', {
      name: `${formatPlainDate(pastDate)}: 3 chapters read`,
    });
    fireEvent.click(pastSquare);
    expect(
      within(heatmapSection).getByText(
        (_, el) =>
          el?.tagName === 'SPAN' &&
          el.textContent === `${formatPlainDate(pastDate)} — 3 chapters read`
      )
    ).toBeInTheDocument();

    // Switch to currentYear and verify readout resets & currentYear data displays
    fireEvent.click(currentYearBtn);
    expect(currentYearBtn).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(heatmapSection).getByText(/Tap or hover any day square to inspect chapters logged/i)
    ).toBeInTheDocument();
    expect(
      within(heatmapSection).getByRole('grid', {
        name: new RegExp(`${currentYear} Bible reading activity`, 'i'),
      })
    ).toBeInTheDocument();
    expect(
      within(heatmapSection).getByText(
        new RegExp(`In ${currentYear}: 1 active reading day \\(1 chapter\\)`, 'i')
      )
    ).toBeInTheDocument();
    expect(within(heatmapSection).getByText(currentMonth)).toBeInTheDocument();
    expect(within(heatmapSection).queryByText(pastMonth)).not.toBeInTheDocument();
  });
});
