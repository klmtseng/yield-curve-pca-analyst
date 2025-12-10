export interface YieldCurvePoint {
  date: string;
  [tenor: string]: number | string; // '2Y': 4.5, etc.
}

export type Tenor = '1M' | '3M' | '6M' | '1Y' | '2Y' | '3Y' | '5Y' | '7Y' | '10Y' | '20Y' | '30Y';

export const TENORS: Tenor[] = ['1M', '3M', '6M', '1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '20Y', '30Y'];

export interface PCAResult {
  eigenvalues: number[];
  eigenvectors: number[][]; // [componentIndex][tenorIndex]
  explainedVariance: number[]; // Percentage 0-1
  cumulativeVariance: number[];
  scores: number[][]; // [dateIndex][componentIndex]
  meanVector: number[];
  tenors: Tenor[];
}

export interface AnalysisState {
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
}
