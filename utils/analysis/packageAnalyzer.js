const fs = require('fs');
const path = require('path');

class PackageAnalyzer {
    constructor() {
        this.packageFiles = [
            { name: 'root', path: 'package.json' },
            { name: 'backend', path: 'backend/package.json' },
            { name: 'client', path: 'client/package.json' },
            { name: 'server', path: 'server/package.json' }
        ];
        this.packages = {};
        this.analysis = {
            duplicates: {},
            versionConflicts: {},
            unused: {},
            consolidationOpportunities: []
        };
    }

    async loadPackageFiles() {
        for (const pkg of this.packageFiles) {
            try {
                const content = fs.readFileSync(pkg.path, 'utf8');
                this.packages[pkg.name] = {
                    ...JSON.parse(content),
                    _path: pkg.path
                };
            } catch (error) {
                console.warn(`Could not load ${pkg.path}: ${error.message}`);
            }
        }
    }

    analyzeDuplicates() {
        const allDeps = {};
        
        // Collect all dependencies from all packages
        Object.keys(this.packages).forEach(pkgName => {
            const pkg = this.packages[pkgName];
            const deps = {
                ...pkg.dependencies || {},
                ...pkg.devDependencies || {}
            };
            
            Object.keys(deps).forEach(depName => {
                if (!allDeps[depName]) {
                    allDeps[depName] = [];
                }
                allDeps[depName].push({
                    package: pkgName,
                    version: deps[depName],
                    type: pkg.dependencies && pkg.dependencies[depName] ? 'dependency' : 'devDependency'
                });
            });
        });

        // Find duplicates and version conflicts
        Object.keys(allDeps).forEach(depName => {
            const occurrences = allDeps[depName];
            if (occurrences.length > 1) {
                this.analysis.duplicates[depName] = occurrences;
                
                // Check for version conflicts
                const versions = [...new Set(occurrences.map(o => o.version))];
                if (versions.length > 1) {
                    this.analysis.versionConflicts[depName] = {
                        occurrences,
                        versions
                    };
                }
            }
        });
    }

    async analyzeUsage() {
        // This will scan the codebase to find which dependencies are actually used
        const usageResults = {};
        
        for (const pkgName of Object.keys(this.packages)) {
            const pkg = this.packages[pkgName];
            const deps = {
                ...pkg.dependencies || {},
                ...pkg.devDependencies || {}
            };
            
            usageResults[pkgName] = {};
            
            for (const depName of Object.keys(deps)) {
                // Skip self-references and file dependencies
                if (depName === pkgName || deps[depName].startsWith('file:')) {
                    continue;
                }
                
                const isUsed = await this.checkDependencyUsage(depName, pkgName);
                usageResults[pkgName][depName] = {
                    version: deps[depName],
                    used: isUsed,
                    type: pkg.dependencies && pkg.dependencies[depName] ? 'dependency' : 'devDependency'
                };
            }
        }
        
        this.analysis.unused = usageResults;
    }

    async checkDependencyUsage(depName, packageName) {
        const searchPaths = this.getSearchPaths(packageName);
        
        // Common import patterns to search for
        const patterns = [
            `require\\(['"\`]${depName}['"\`]\\)`,
            `require\\(['"\`]${depName}/`,
            `from\\s+['"\`]${depName}['"\`]`,
            `from\\s+['"\`]${depName}/`,
            `import\\s+['"\`]${depName}['"\`]`,
            `import\\s+['"\`]${depName}/`,
            `import\\s+.*\\s+from\\s+['"\`]${depName}['"\`]`,
            `import\\s+.*\\s+from\\s+['"\`]${depName}/`
        ];
        
        for (const searchPath of searchPaths) {
            if (!fs.existsSync(searchPath)) continue;
            
            const found = await this.searchInDirectory(searchPath, patterns);
            if (found) return true;
        }
        
        return false;
    }

    getSearchPaths(packageName) {
        switch (packageName) {
            case 'root':
                return ['scripts/', 'utils/'];
            case 'backend':
                return ['backend/'];
            case 'client':
                return ['client/src/', 'client/public/'];
            case 'server':
                return ['server/'];
            default:
                return [];
        }
    }

    async searchInDirectory(dirPath, patterns) {
        try {
            const files = this.getAllFiles(dirPath);
            const jsFiles = files.filter(file => 
                file.endsWith('.js') || 
                file.endsWith('.jsx') || 
                file.endsWith('.ts') || 
                file.endsWith('.tsx')
            );
            
            for (const file of jsFiles) {
                try {
                    const content = fs.readFileSync(file, 'utf8');
                    for (const pattern of patterns) {
                        if (new RegExp(pattern).test(content)) {
                            return true;
                        }
                    }
                } catch (error) {
                    // Skip files that can't be read
                    continue;
                }
            }
        } catch (error) {
            // Skip directories that can't be read
        }
        
        return false;
    }

    getAllFiles(dirPath, arrayOfFiles = []) {
        try {
            const files = fs.readdirSync(dirPath);
            
            files.forEach(file => {
                const fullPath = path.join(dirPath, file);
                try {
                    if (fs.statSync(fullPath).isDirectory()) {
                        // Skip node_modules and other common directories
                        if (!['node_modules', '.git', 'build', 'dist', '.next'].includes(file)) {
                            arrayOfFiles = this.getAllFiles(fullPath, arrayOfFiles);
                        }
                    } else {
                        arrayOfFiles.push(fullPath);
                    }
                } catch (error) {
                    // Skip files/directories that can't be accessed
                }
            });
        } catch (error) {
            // Skip directories that can't be read
        }
        
        return arrayOfFiles;
    }

    generateConsolidationRecommendations() {
        const recommendations = [];
        
        // Recommend moving common dependencies to root
        const commonDeps = {};
        Object.keys(this.analysis.duplicates).forEach(depName => {
            const occurrences = this.analysis.duplicates[depName];
            if (occurrences.length >= 2 && occurrences.every(o => o.type === 'dependency')) {
                commonDeps[depName] = occurrences;
            }
        });
        
        if (Object.keys(commonDeps).length > 0) {
            recommendations.push({
                type: 'move-to-root',
                description: 'Move common dependencies to root package.json',
                dependencies: commonDeps
            });
        }
        
        // Recommend version alignment
        Object.keys(this.analysis.versionConflicts).forEach(depName => {
            const conflict = this.analysis.versionConflicts[depName];
            recommendations.push({
                type: 'align-versions',
                description: `Align versions for ${depName}`,
                dependency: depName,
                conflict
            });
        });
        
        this.analysis.consolidationOpportunities = recommendations;
    }

    generateReport() {
        const report = {
            summary: {
                totalPackages: Object.keys(this.packages).length,
                duplicateCount: Object.keys(this.analysis.duplicates).length,
                versionConflicts: Object.keys(this.analysis.versionConflicts).length,
                consolidationOpportunities: this.analysis.consolidationOpportunities.length
            },
            duplicates: this.analysis.duplicates,
            versionConflicts: this.analysis.versionConflicts,
            unused: this.analysis.unused,
            consolidationOpportunities: this.analysis.consolidationOpportunities
        };
        
        return report;
    }

    async analyze() {
        console.log('Loading package files...');
        await this.loadPackageFiles();
        
        console.log('Analyzing duplicates...');
        this.analyzeDuplicates();
        
        console.log('Analyzing usage...');
        await this.analyzeUsage();
        
        console.log('Generating consolidation recommendations...');
        this.generateConsolidationRecommendations();
        
        return this.generateReport();
    }
}

module.exports = { PackageAnalyzer };