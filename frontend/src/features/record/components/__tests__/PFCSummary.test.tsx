import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PFCSummary } from '../PFCSummary';

describe('PFCSummary', () => {
  it('各栄養素値が正しく表示される', () => {
    render(
      <PFCSummary calories={1500} protein={60.5} fat={45.3} carbs={200.7} />
    );

    expect(screen.getByText('1500')).toBeInTheDocument();
    expect(screen.getByText('61')).toBeInTheDocument();  // Math.round(60.5)
    expect(screen.getByText('45')).toBeInTheDocument();   // Math.round(45.3)
    expect(screen.getByText('201')).toBeInTheDocument();  // Math.round(200.7)
  });

  it('null値の場合 "--" が表示される', () => {
    render(
      <PFCSummary calories={null} protein={null} fat={null} carbs={null} />
    );

    const dashes = screen.getAllByText('--');
    expect(dashes).toHaveLength(4);
  });

  it('0値でも正常に表示される', () => {
    render(
      <PFCSummary calories={0} protein={0} fat={0} carbs={0} />
    );

    const zeros = screen.getAllByText('0');
    expect(zeros).toHaveLength(4);
  });

  it('栄養サマリーのリージョンが存在する', () => {
    render(
      <PFCSummary calories={100} protein={10} fat={5} carbs={20} />
    );

    expect(screen.getByRole('region', { name: '栄養サマリー' })).toBeInTheDocument();
  });
});