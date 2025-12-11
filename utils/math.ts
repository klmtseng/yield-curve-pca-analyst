
import { Tenor, PCAResult, YieldCurvePoint } from '../types';

// Helper to calculate mean of columns
const computeMeanVector = (data: number[][]): number[] => {
  const rows = data.length;
  if (rows === 0) return [];
  const cols = data[0].length;
  const means = new Array(cols).fill(0);
  
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      means[j] += data[i][j];
    }
  }
  return means.map(sum => sum / rows);
};

// Helper to center data
const centerData = (data: number[][], means: number[]): number[][] => {
  return data.map(row => row.map((val, j) => val - means[j]));
};

// Helper to compute covariance matrix
const computeCovarianceMatrix = (centeredData: number[][]): number[][] => {
  const n = centeredData.length;
  const m = centeredData[0] ? centeredData[0].length : 0;
  
  // Need at least 2 points to calculate variance (n-1)
  if (n < 2 || m === 0) {
    return Array.from({ length: m }, () => new Array(m).fill(0));
  }

  const cov = Array.from({ length: m }, () => new Array(m).fill(0));

  for (let i = 0; i < m; i++) {
    for (let j = i; j < m; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += centeredData[k][i] * centeredData[k][j];
      }
      cov[i][j] = sum / (n - 1);
      cov[j][i] = cov[i][j]; // Symmetric
    }
  }
  return cov;
};

// Jacobi Eigenvalue Algorithm for symmetric matrices
const jacobiEigen = (matrix: number[][], maxIter = 100, tol = 1e-8) => {
  const n = matrix.length;
  if (n === 0) return { eigenvalues: [], eigenvectors: [] };

  let V: number[][] = Array.from({ length: n }, (_, i) => 
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  ); // Identity matrix
  let D = matrix.map(row => [...row]); // Copy of matrix
  
  for (let iter = 0; iter < maxIter; iter++) {
    let maxVal = 0;
    let p = 0, q = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(D[i][j]) > maxVal) {
          maxVal = Math.abs(D[i][j]);
          p = i;
          q = j;
        }
      }
    }

    if (maxVal < tol) break;

    const Dpp = D[p][p];
    const Dqq = D[q][q];
    const Dpq = D[p][q];

    const theta = 0.5 * Math.atan2(2 * Dpq, Dpp - Dqq);
    const c = Math.cos(theta);
    const s = Math.sin(theta);

    D[p][p] = c * c * Dpp - 2 * s * c * Dpq + s * s * Dqq;
    D[q][q] = s * s * Dpp + 2 * s * c * Dpq + c * c * Dqq;
    D[p][q] = 0;
    D[q][p] = 0;

    for (let i = 0; i < n; i++) {
      if (i !== p && i !== q) {
        const Dip = D[i][p];
        const Diq = D[i][q];
        D[i][p] = c * Dip - s * Diq;
        D[p][i] = D[i][p];
        D[i][q] = s * Dip + c * Diq;
        D[q][i] = D[i][q];
      }
    }

    for (let i = 0; i < n; i++) {
      const Vip = V[i][p];
      const Viq = V[i][q];
      V[i][p] = c * Vip - s * Viq;
      V[i][q] = s * Vip + c * Viq;
    }
  }

  const eigenvalues = D.map((row, i) => row[i]);
  const indices = Array.from({ length: n }, (_, i) => i);
  indices.sort((a, b) => eigenvalues[b] - eigenvalues[a]);

  const sortedEigenvalues = indices.map(i => eigenvalues[i]);
  const sortedEigenvectors = indices.map(i => V.map(row => row[i]));

  return {
    eigenvalues: sortedEigenvalues,
    eigenvectors: sortedEigenvectors
  };
};

export const performPCA = (
  rawDateData: any[], 
  tenors: Tenor[]
): PCAResult => {
  // Guard against empty data
  if (!rawDateData || rawDateData.length === 0) {
    return {
      eigenvalues: [], eigenvectors: [], explainedVariance: [],
      cumulativeVariance: [], scores: [], meanVector: [], tenors
    };
  }

  // Safety map to avoid NaNs if data is malformed
  const matrix = rawDateData.map(d => tenors.map(t => {
    const val = Number(d[t]);
    return isNaN(val) ? 0 : val;
  }));

  const meanVector = computeMeanVector(matrix);
  const centered = centerData(matrix, meanVector);
  const cov = computeCovarianceMatrix(centered);
  const { eigenvalues, eigenvectors } = jacobiEigen(cov);
  
  // Align static PCA signs for consistency
  const alignedEigenvectors = alignEigenvectors(eigenvectors);

  const totalVariance = eigenvalues.reduce((a, b) => a + b, 0);
  
  // Safety check: if Total Variance is 0 (e.g. constant data), prevent NaN
  const explainedVariance = totalVariance > 1e-12 
    ? eigenvalues.map(v => v / totalVariance)
    : new Array(eigenvalues.length).fill(0);

  const cumulativeVariance = explainedVariance.reduce((acc, v, i) => {
    if (i === 0) return [v];
    acc.push(acc[i - 1] + v);
    return acc;
  }, [] as number[]);

  const scores = centered.map(row => {
    return alignedEigenvectors.map(vec => {
      return row.reduce((sum, val, idx) => sum + val * vec[idx], 0);
    });
  });

  return {
    eigenvalues,
    eigenvectors: alignedEigenvectors,
    explainedVariance,
    cumulativeVariance,
    scores,
    meanVector,
    tenors
  };
};

/**
 * Ensures eigenvectors point in a consistent "Fundamental" direction.
 * PC1: Sum > 0 (Rates up)
 * PC2: Long - Short > 0 (Steepener)
 * PC3: Mid - Wings > 0 (Convexity)
 */
const alignEigenvectors = (eigenvectors: number[][]): number[][] => {
  return eigenvectors.map((vec, i) => {
    let sign = 1;
    if (i === 0) {
      // PC1: Force Average Loading to be positive
      const sum = vec.reduce((a, b) => a + b, 0);
      if (sum < 0) sign = -1;
    } else if (i === 1) {
      // PC2: Force Long End > Short End (Steepener)
      const slope = vec.length > 0 ? vec[vec.length - 1] - vec[0] : 0;
      if (slope < 0) sign = -1;
    } else if (i === 2) {
      // PC3: Force Middle > Wings (Convexity)
      const midIdx = Math.floor(vec.length / 2);
      const wingsAvg = vec.length > 0 ? (vec[0] + vec[vec.length - 1]) / 2 : 0;
      if (vec[midIdx] < wingsAvg) sign = -1;
    }
    return sign === 1 ? vec : vec.map(v => -v);
  });
};

/**
 * Performs PCA on sliding windows to track how explained variance changes over time.
 */
export const performRollingPCA = (
  fullData: any[],
  tenors: Tenor[],
  windowSize: number = 60
) => {
  const results = [];
  // Safe matrix mapping
  const matrix = fullData.map(d => tenors.map(t => {
    const val = Number(d[t]);
    return isNaN(val) ? 0 : val;
  }));
  
  if (fullData.length < windowSize) return [];

  for (let i = windowSize; i < fullData.length; i++) {
    const windowMatrix = matrix.slice(i - windowSize, i);
    const meanVector = computeMeanVector(windowMatrix);
    const centered = centerData(windowMatrix, meanVector);
    const cov = computeCovarianceMatrix(centered);
    const { eigenvalues } = jacobiEigen(cov);
    
    const totalVariance = eigenvalues.reduce((a, b) => a + b, 0);
    
    // Safety check for NaN
    const explained = totalVariance > 1e-12 
      ? eigenvalues.map(v => (v / totalVariance) * 100)
      : new Array(eigenvalues.length).fill(0);

    results.push({
      date: fullData[i].date,
      PC1: explained[0] || 0,
      PC2: explained[1] || 0,
      PC3: explained[2] || 0
    });
  }
  
  return results;
};

export interface RollingLoadingResult {
  date: string;
  pc1: number[];
  pc2: number[];
  pc3: number[];
}

/**
 * Calculates rolling eigenvectors (loadings) to visualize the surface evolution.
 */
export const calculateRollingLoadings = (
  fullData: YieldCurvePoint[],
  tenors: Tenor[],
  windowSize: number = 30
): RollingLoadingResult[] => {
  const results: RollingLoadingResult[] = [];
  const matrix = fullData.map(d => tenors.map(t => {
    const val = Number(d[t]);
    return isNaN(val) ? 0 : val;
  }));
  
  if (fullData.length < windowSize) return [];

  for (let i = windowSize; i < fullData.length; i++) {
    const windowMatrix = matrix.slice(i - windowSize, i);
    const meanVector = computeMeanVector(windowMatrix);
    const centered = centerData(windowMatrix, meanVector);
    const cov = computeCovarianceMatrix(centered);
    const { eigenvectors } = jacobiEigen(cov);
    
    // Critical: Align signs so the heatmap is smooth
    const aligned = alignEigenvectors(eigenvectors);

    results.push({
      date: fullData[i].date,
      pc1: aligned[0] || [],
      pc2: aligned[1] || [],
      pc3: aligned[2] || []
    });
  }
  return results;
};
