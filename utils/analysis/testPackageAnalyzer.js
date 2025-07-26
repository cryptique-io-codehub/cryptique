const { PackageAnalyzer } = require('./packageAnalyzer');

async function runPackageAnalysis() {
    try {
        const analyzer = new PackageAnalyzer();
        const report = await analyzer.analyze();
        
        console.log('\n=== PACKAGE DEPENDENCY ANALYSIS REPORT ===\n');
        
        // Summary
        console.log('📊 SUMMARY:');
        console.log(`- Total packages analyzed: ${report.summary.totalPackages}`);
        console.log(`- Duplicate dependencies found: ${report.summary.duplicateCount}`);
        console.log(`- Version conflicts: ${report.summary.versionConflicts}`);
        console.log(`- Consolidation opportunities: ${report.summary.consolidationOpportunities}`);
        
        // Duplicates
        if (Object.keys(report.duplicates).length > 0) {
            console.log('\n🔄 DUPLICATE DEPENDENCIES:');
            Object.keys(report.duplicates).forEach(depName => {
                const occurrences = report.duplicates[depName];
                console.log(`\n  ${depName}:`);
                occurrences.forEach(occ => {
                    console.log(`    - ${occ.package}: ${occ.version} (${occ.type})`);
                });
            });
        }
        
        // Version conflicts
        if (Object.keys(report.versionConflicts).length > 0) {
            console.log('\n⚠️  VERSION CONFLICTS:');
            Object.keys(report.versionConflicts).forEach(depName => {
                const conflict = report.versionConflicts[depName];
                console.log(`\n  ${depName} has ${conflict.versions.length} different versions:`);
                conflict.occurrences.forEach(occ => {
                    console.log(`    - ${occ.package}: ${occ.version}`);
                });
            });
        }
        
        // Unused dependencies
        console.log('\n🗑️  POTENTIALLY UNUSED DEPENDENCIES:');
        Object.keys(report.unused).forEach(pkgName => {
            const pkgUnused = report.unused[pkgName];
            const unusedDeps = Object.keys(pkgUnused).filter(dep => !pkgUnused[dep].used);
            
            if (unusedDeps.length > 0) {
                console.log(`\n  ${pkgName}:`);
                unusedDeps.forEach(dep => {
                    const info = pkgUnused[dep];
                    console.log(`    - ${dep}: ${info.version} (${info.type})`);
                });
            }
        });
        
        // Consolidation opportunities
        if (report.consolidationOpportunities.length > 0) {
            console.log('\n💡 CONSOLIDATION RECOMMENDATIONS:');
            report.consolidationOpportunities.forEach((rec, index) => {
                console.log(`\n  ${index + 1}. ${rec.description}`);
                if (rec.type === 'move-to-root') {
                    Object.keys(rec.dependencies).forEach(depName => {
                        console.log(`     - ${depName}`);
                    });
                } else if (rec.type === 'align-versions') {
                    console.log(`     - Current versions: ${rec.conflict.versions.join(', ')}`);
                }
            });
        }
        
        // Save detailed report
        const fs = require('fs');
        fs.writeFileSync('utils/analysis/package-analysis-report.json', JSON.stringify(report, null, 2));
        console.log('\n📄 Detailed report saved to: utils/analysis/package-analysis-report.json');
        
    } catch (error) {
        console.error('Error running package analysis:', error);
    }
}

if (require.main === module) {
    runPackageAnalysis();
}

module.exports = { runPackageAnalysis };