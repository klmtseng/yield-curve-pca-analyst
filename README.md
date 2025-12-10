
# Yield Curve PCA Analyst

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/react-19-blue)
![TypeScript](https://img.shields.io/badge/typescript-5-blue)

**Yield Curve PCA Analyst** is an interactive financial analytics tool designed to decompose US Treasury Yield Curves into their primary risk factors: **Level**, **Slope**, and **Curvature**.

Built with React and TypeScript, it allows users to import data directly from the Federal Reserve Economic Data (FRED) API or via CSV, visualize the principal components, and automatically analyze the market regime based on statistical factors.

## 🚀 Features

*   **Data Integration**:
    *   **FRED API**: Direct integration with the St. Louis Fed database to fetch historical treasury yields (1M to 30Y).
    *   **CSV Import**: Support for custom datasets.
*   **Advanced Analytics**:
    *   **Client-side PCA**: Performs Principal Component Analysis entirely in the browser using the Jacobi algorithm.
    *   **Factor Identification**: Automatically extracts and visualizes Eigenvalues and Eigenvectors.
*   **Interactive Visualizations**:
    *   **3D-style Yield Surface**: Visualize the evolution of the curve over time.
    *   **Loadings Chart**: See how different maturities react to specific risk factors.
    *   **Score Time Series**: Track the historical performance of Level, Slope, and Curvature.
    *   **Scree Plot**: Understand the variance explained by each component.
*   **Regime Analysis**:
    *   **Automated Heuristics**: Deterministic analysis of PCA loadings and score trends to identify market regimes (e.g., "Bear Steepening", "Bull Flattening") without external AI dependencies.

## 🛠️ Tech Stack

*   **Frontend**: React 19, TypeScript
*   **Styling**: Tailwind CSS
*   **Charts**: Recharts
*   **Math**: Custom Linear Algebra utilities (Jacobi Algorithm)

## 📦 Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/yield-curve-pca-analyst.git
    cd yield-curve-pca-analyst
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run Locally**
    ```bash
    npm run dev
    ```

## 📊 Usage Guide

1.  **Load Data**:
    *   Click **"FRED Import"** to fetch the latest Treasury data (requires a free FRED API Key).
    *   Or click **"Import CSV"** to upload your own time-series data.
2.  **Analyze**:
    *   The app automatically computes PCA upon data load.
    *   View the **"View Data & Results"** modal for detailed statistics and educational guides.
3.  **Interpret**:
    *   Read the statistical analysis in the right-hand panel to understand the current macro-economic implications of the curve's shape.

## 📝 License

This project is licensed under the MIT License.
