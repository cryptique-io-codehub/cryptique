# Codebase Analysis Infrastructure

This directory contains utilities for analyzing the codebase to identify unused files, duplicate code patterns, and consolidation opportunities.

## Components

### 1. FileAnalyzer (`fileAnalyzer.js`)
Scans individual files for imports, exports, and usage patterns.

**Features:**
- Analyzes JavaScript/TypeScript files for import/export statements
- Detects CommonJS require/module.exports patterns
- Identifies empty files and calculates file statistics
- Supports multiple file extensions (.js, .jsx, .ts, .tsx, .json, .md)

**Usage:**
```javascript
const FileAnalyzer = require('./fileAnalyzer');
const analyzer = new FileAnalyzer();

// Analyze a single file
const analysis = await analyzer.analyzeJSFile('./path/to/file.js');

// Scan directory for files
const files = await analyzer.scanDirectory('./src');

// Check if file is empty
const isEmpty = await analyzer.isFileEmpty('./path/to/file.js');
```

### 2. DependencyMapper (`dependencyMapper.js`)
Tracks file relationships and builds dependency graphs.

**Features:**
- Builds forward and reverse dependency graphs
- Detects circular dependencies
- Identifies unused and orphaned files
- Analyzes package.json dependencies for duplicates
- Provides safety analysis for file removal

**Usage:**
```javascript
const DependencyMapper = require('./dependencyMapper');
const mapper = new DependencyMapper();

// Build complete dependency graph
const analysis = await mapper.buildDependencyGraph('./src');

// Get files that depend on a specific file
const dependents = mapper.getDependents('./path/to/file.js');

// Check if file can be safely removed
const safety = mapper.canSafelyRemove('./path/to/file.js');
```

### 3. PatternDetector (`patternDetector.js`)
Identifies duplicate code blocks and common patterns.

**Features:**
- Detects duplicate code blocks across files
- Identifies similar functions that can be consolidated
- Analyzes import patterns for duplicates
- Detects configuration patterns (CORS, middleware, etc.)
- Calculates code similarity using Levenshtein distance

**Usage:**
```javascript
const PatternDetector = require('./patternDetector');
const detector = new PatternDetector();

// Detect patterns in analyzed files
const patterns = await detector.detectPatterns(fileAnalysisResults);

// Calculate similarity between code patterns
const similarity = detector.calculateSimilarity(pattern1, pattern2);
```

### 4. AnalysisOrchestrator (`analysisOrchestrator.js`)
Coordinates all analysis utilities and provides unified interface.

**Features:**
- Runs complete codebase analysis
- Generates actionable recommendations
- Calculates health metrics and scores
- Saves results to JSON files
- Provides human-readable reports

**Usage:**
```javascript
const AnalysisOrchestrator = require('./analysisOrchestrator');
const orchestrator = new AnalysisOrchestrator();

// Run complete analysis
const results = await orchestrator.runCompleteAnalysis('./src', {
  saveResults: true,
  outputPath: './analysis-results.json'
});

// Generate human-readable report
const report = orchestrator.generateReport();
```

## CLI Tool

Use the command-line interface for quick analysis:

```bash
# Analyze current directory
node utils/analysis/cli.js

# Analyze specific directory
node utils/analysis/cli.js --path ./backend

# Save to custom location
node utils/analysis/cli.js --output ./reports/analysis.json

# Show help
node utils/analysis/cli.js --help
```

## API Reference

### Main Export (`index.js`)

```javascript
const {
  FileAnalyzer,
  DependencyMapper,
  PatternDetector,
  AnalysisOrchestrator,
  analyzeCodebase,
  analyzeFiles,
  detectPatterns,
  buildDependencyGraph
} = require('./utils/analysis');

// Convenience function for complete analysis
const results = await analyzeCodebase('./src');
```

## Analysis Results Structure

```javascript
{
  metadata: {
    timestamp: "2025-01-01T00:00:00.000Z",
    analysisTime: 1234,
    rootPath: "./src",
    version: "1.0.0"
  },
  summary: {
    totalFiles: 100,
    jsFiles: 80,
    packageFiles: 3,
    unusedFiles: 5,
    duplicatePatterns: 10,
    duplicateDependencies: 2
  },
  dependencies: {
    graph: Map, // Forward dependency graph
    reverse: Map, // Reverse dependency graph
    relationships: {
      imports: Map,
      exports: Map,
      circular: [],
      orphaned: []
    },
    unused: [],
    duplicates: []
  },
  patterns: {
    duplicateBlocks: [],
    commonPatterns: [],
    similarFunctions: [],
    duplicateImports: [],
    duplicateConfigurations: []
  },
  recommendations: {
    filesToRemove: [],
    codesToConsolidate: [],
    utilitiesToCreate: [],
    dependenciesToCleanup: [],
    configurationsToUnify: [],
    priority: {
      high: [],
      medium: [],
      low: []
    }
  },
  metrics: {
    codeHealth: { score: 85.5, factors: {} },
    maintainability: { score: 92.1, factors: {} },
    redundancy: { score: 78.3, factors: {} },
    complexity: {
      averageFunctionComplexity: 3.2,
      highComplexityFunctions: 5
    }
  }
}
```

## Health Metrics

### Code Health Score (0-100)
- **Unused File Ratio**: Percentage of files not imported by others
- **Duplicate Block Ratio**: Percentage of files with duplicate code blocks

### Maintainability Score (0-100)
- **Circular Dependencies**: Number of circular dependency chains
- **Orphaned Files**: Files with no imports or exports

### Redundancy Score (0-100)
- **Duplicate Dependencies**: Dependencies appearing in multiple package.json files
- **Configuration Duplicates**: Duplicate configuration patterns

## Testing

Run the test suite to verify all components:

```bash
node utils/analysis/test.js
```

## Configuration

The analysis can be customized by modifying the following parameters:

- `minPatternLength`: Minimum lines for duplicate pattern detection (default: 5)
- `similarityThreshold`: Similarity threshold for pattern matching (default: 0.8)
- `supportedExtensions`: File extensions to analyze (default: .js, .jsx, .ts, .tsx, .json, .md)
- `ignorePatterns`: Directories to ignore (default: node_modules, .git, build, dist)

## Requirements Addressed

This infrastructure addresses the following requirements from the specification:

- **Requirement 1.1**: Identifies files not referenced or imported by other files
- **Requirement 1.2**: Identifies functions or code blocks that appear multiple times across different files
- **Requirement 1.3**: Safely removes unused files without breaking functionality
- **Requirement 1.4**: Removes empty directories after file removal
- **Requirement 1.5**: Identifies unused markdown files for documentation cleanup

## Next Steps

After running the analysis, use the generated recommendations to:

1. Remove unused files (low priority)
2. Consolidate duplicate code blocks (medium priority)
3. Create utility functions for similar functions (high priority)
4. Clean up duplicate dependencies (medium/high priority)
5. Unify configuration patterns (high priority)