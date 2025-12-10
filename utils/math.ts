import { Tenor, PCAResult } from '../types';

// Helper to calculate mean of columns
const computeMeanVector = (data: number[][]): number[] => {
  const rows = data.length;
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
  const m = centeredData[0].length;
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
// Returns { eigenvalues: number[], eigenvectors: number[][] }
const jacobiEigen = (matrix: number[][], maxIter = 100, tol = 1e-8) => {
  const n = matrix.length;
  // Fix: explicitly type V as number[][] because (i===j ? 1 : 0) implies (0|1)[][] type inference
  let V: number[][] = Array.from({ length: n }, (_, i) => 
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  ); // Identity matrix
  let D = matrix.map(row => [...row]); // Copy of matrix
  
  for (let iter = 0; iter < maxIter; iter++) {
    // Find max off-diagonal element
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

    const theta = 0.5 * Math.atan2(2 * D[p][q], D[p][p] - D[q][q]);
    const c = Math.cos(theta);
    const s = Math.sin(theta);

    // Update D (simulating D = J^T * D * J)
    // We only need to update relevant rows/cols
    const Dpp = D[p][p];
    const Dqq = D[q][q];
    const Dpq = D[p][q];

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

    // Update V (eigenvectors)
    for (let i = 0; i < n; i++) {
      const Vip = V[i][p];
      const Viq = V[i][q];
      V[i][p] = c * Vip - s * Viq;
      V[i][q] = s * Vip + c * Viq;
    }
  }

  // Extract eigenvalues (diagonal of D)
  const eigenvalues = D.map((row, i) => row[i]);
  
  // Sort by eigenvalue descending
  const indices = Array.from({ length: n }, (_, i) => i);
  indices.sort((a, b) => eigenvalues[b] - eigenvalues[a]);

  const sortedEigenvalues = indices.map(i => eigenvalues[i]);
  const sortedEigenvectors = indices.map(i => {
    // Get column i from V
    return V.map(row => row[i]);
  });

  // Transpose eigenvectors to be [component][tenor]
  const transposedVectors = sortedEigenvectors[0].map((_, colIndex) => 
     sortedEigenvectors.map(row => row[colIndex])
  );
  
  // Actually, the sortedEigenvectors logic above puts eigenvectors as COLUMNS of V.
  // We want to return an array of vectors. The `sortedEigenvectors` array above
  // is actually constructed as `V.map(row => row[i])` which extracts the i-th column.
  // So sortedEigenvectors[k] is the k-th eigenvector. This is correct format for usage.

  return {
    eigenvalues: sortedEigenvalues,
    eigenvectors: sortedEigenvectors
  };
};

export const performPCA = (
  rawDateData: any[], 
  tenors: Tenor[]
): PCAResult => {
  // 1. Extract numeric matrix
  const matrix = rawDateData.map(d => tenors.map(t => Number(d[t])));
  
  // 2. Center Data
  const meanVector = computeMeanVector(matrix);
  const centered = centerData(matrix, meanVector);
  
  // 3. Covariance
  const cov = computeCovarianceMatrix(centered);
  
  // 4. Eigen Decomposition
  const { eigenvalues, eigenvectors } = jacobiEigen(cov);
  
  // 5. Explained Variance
  const totalVariance = eigenvalues.reduce((a, b) => a + b, 0);
  const explainedVariance = eigenvalues.map(v => v / totalVariance);
  const cumulativeVariance = explainedVariance.reduce((acc, v, i) => {
    if (i === 0) return [v];
    acc.push(acc[i - 1] + v);
    return acc;
  }, [] as number[]);

  // 6. Calculate Scores (Project data onto eigenvectors)
  // Score[i][k] = dot(Data[i], Eigenvector[k])
  // Note: eigenvectors are rows in our result structure from jacobi helper?
  // Let's verify: `sortedEigenvectors` contains arrays where each array is a vector.
  // So `eigenvectors[0]` is PC1.
  const scores = centered.map(row => {
    return eigenvectors.map(vec => {
      return row.reduce((sum, val, idx) => sum + val * vec[idx], 0);
    });
  });

  return {
    eigenvalues,
    eigenvectors, // [PC1_vec, PC2_vec, ...]
    explainedVariance,
    cumulativeVariance,
    scores,
    meanVector,
    tenors
  };
};