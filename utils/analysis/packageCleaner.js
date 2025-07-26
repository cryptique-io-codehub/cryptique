const fs = require('fs');
const path = require('path');

class PackageCleaner {
    constructor() {
        this.packageFiles = [
            { name: 'root', path: 'package.json' },
            { name: 'backend', path: 'backend/package.json' },
            { name: 'client', path: 'client/package.json' },
            { name: 'server', path: 'server/package.json' }
        ];
        
        // Safe to remove - confirmed unused
        this.safeRemovals = {
            root: {
                dependencies: ['@google/genai', 'ethers'],
                devDependencies: []
            },
            backend: {
                dependencies: ['@duneanalytics/client-sdk', 'node-cron', 'puppeteer'],
                devDependencies: ['chalk', 'mocha']
            },
            client: {
                dependencies: [
                    '@emotion/react', '@emotion/styled', '@headlessui/react',
                    'chart.js', 'jsonwebtoken', 'jwt-decode', 'react-chartjs-2',
                    'react-grid-layout', 'react-icons', 'react-simple-maps',
                    'web-vitals'
                ],
                devDependencies: ['tailwindcss']
            },
            server: {
                dependencies: [
                    '@tensorflow/tfjs-node', 'langchain', 'natural',
                    'express-http-proxy', 'sticky-session', 'node-os-utils'
                ],
                devDependencies: ['jest', 'nodemon', 'supertest']
            }
        };
        
        // Version alignments - update to latest version
        this.versionAlignments = {
            '@google/generative-ai': {
                targetVersion: '^0.20.0',
                packages: ['client', 'server']
            },
            'axios': {
                targetVersion: '^1.8.4',
                packages: ['server']
            },
            'dotenv': {
                targetVersion: '^16.5.0',
                packages: ['server']
            },
            'express': {
                targetVersion: '^4.21.2',
                packages: ['server']
            },
            'express-rate-limit': {
                targetVersion: '^7.5.0',
                packages: ['server']
            },
            'node-cron': {
                targetVersion: '^3.0.3',
                packages: ['server']
            },
            'uuid': {
                targetVersion: '^11.1.0',
                packages: ['server']
            }
        };
        
        // Dependencies to move from dependencies to devDependencies
        this.moveToDevDeps = {
            backend: ['nodemon'],
            root: ['concurrently']
        };
    }

    loadPackage(packagePath) {
        try {
            const content = fs.readFileSync(packagePath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            console.error(`Error loading ${packagePath}:`, error.message);
            return null;
        }
    }

    savePackage(packagePath, packageData) {
        try {
            const content = JSON.stringify(packageData, null, 2) + '\n';
            fs.writeFileSync(packagePath, content);
            console.log(`✅ Updated ${packagePath}`);
            return true;
        } catch (error) {
            console.error(`❌ Error saving ${packagePath}:`, error.message);
            return false;
        }
    }

    removeDependencies(packageData, dependenciesToRemove, type = 'dependencies') {
        if (!packageData[type]) return [];
        
        const removed = [];
        dependenciesToRemove.forEach(dep => {
            if (packageData[type][dep]) {
                delete packageData[type][dep];
                removed.push(dep);
            }
        });
        
        return removed;
    }

    moveDependency(packageData, depName, fromType, toType) {
        if (packageData[fromType] && packageData[fromType][depName]) {
            if (!packageData[toType]) {
                packageData[toType] = {};
            }
            packageData[toType][depName] = packageData[fromType][depName];
            delete packageData[fromType][depName];
            return true;
        }
        return false;
    }

    updateVersion(packageData, depName, newVersion) {
        let updated = false;
        
        if (packageData.dependencies && packageData.dependencies[depName]) {
            packageData.dependencies[depName] = newVersion;
            updated = true;
        }
        
        if (packageData.devDependencies && packageData.devDependencies[depName]) {
            packageData.devDependencies[depName] = newVersion;
            updated = true;
        }
        
        return updated;
    }

    cleanPackage(packageName, packagePath) {
        console.log(`\n🔧 Cleaning ${packageName} (${packagePath})`);
        
        const packageData = this.loadPackage(packagePath);
        if (!packageData) return false;
        
        let hasChanges = false;
        
        // Remove unused dependencies
        if (this.safeRemovals[packageName]) {
            const removals = this.safeRemovals[packageName];
            
            if (removals.dependencies.length > 0) {
                const removed = this.removeDependencies(packageData, removals.dependencies, 'dependencies');
                if (removed.length > 0) {
                    console.log(`  🗑️  Removed dependencies: ${removed.join(', ')}`);
                    hasChanges = true;
                }
            }
            
            if (removals.devDependencies.length > 0) {
                const removed = this.removeDependencies(packageData, removals.devDependencies, 'devDependencies');
                if (removed.length > 0) {
                    console.log(`  🗑️  Removed devDependencies: ${removed.join(', ')}`);
                    hasChanges = true;
                }
            }
        }
        
        // Move dependencies to devDependencies
        if (this.moveToDevDeps[packageName]) {
            this.moveToDevDeps[packageName].forEach(dep => {
                if (this.moveDependency(packageData, dep, 'dependencies', 'devDependencies')) {
                    console.log(`  📦 Moved ${dep} to devDependencies`);
                    hasChanges = true;
                }
            });
        }
        
        // Update versions
        Object.keys(this.versionAlignments).forEach(dep => {
            const alignment = this.versionAlignments[dep];
            if (alignment.packages.includes(packageName)) {
                if (this.updateVersion(packageData, dep, alignment.targetVersion)) {
                    console.log(`  🔄 Updated ${dep} to ${alignment.targetVersion}`);
                    hasChanges = true;
                }
            }
        });
        
        // Save if changes were made
        if (hasChanges) {
            return this.savePackage(packagePath, packageData);
        } else {
            console.log(`  ✨ No changes needed for ${packageName}`);
            return true;
        }
    }

    async cleanAllPackages() {
        console.log('🚀 Starting package cleanup process...\n');
        
        let allSuccessful = true;
        
        for (const pkg of this.packageFiles) {
            const success = this.cleanPackage(pkg.name, pkg.path);
            if (!success) {
                allSuccessful = false;
            }
        }
        
        if (allSuccessful) {
            console.log('\n✅ Package cleanup completed successfully!');
            console.log('\n📋 Next steps:');
            console.log('1. Run npm install in each directory to update package-lock.json');
            console.log('2. Test all services to ensure functionality is preserved');
            console.log('3. Commit changes after verification');
        } else {
            console.log('\n❌ Some packages failed to update. Please check the errors above.');
        }
        
        return allSuccessful;
    }

    generateCleanupReport() {
        const report = {
            timestamp: new Date().toISOString(),
            safeRemovals: this.safeRemovals,
            versionAlignments: this.versionAlignments,
            moveToDevDeps: this.moveToDevDeps,
            summary: {
                totalDependenciesRemoved: 0,
                totalVersionsAligned: Object.keys(this.versionAlignments).length,
                totalMoved: 0
            }
        };
        
        // Count total removals
        Object.values(this.safeRemovals).forEach(pkg => {
            report.summary.totalDependenciesRemoved += 
                pkg.dependencies.length + pkg.devDependencies.length;
        });
        
        // Count total moves
        Object.values(this.moveToDevDeps).forEach(deps => {
            report.summary.totalMoved += deps.length;
        });
        
        return report;
    }
}

module.exports = { PackageCleaner };