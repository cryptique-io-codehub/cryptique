const { PackageCleaner } = require('./packageCleaner');
const fs = require('fs');

async function runPackageCleanup() {
    try {
        console.log('=== PACKAGE CLEANUP PROCESS ===\n');
        
        const cleaner = new PackageCleaner();
        
        // Generate and save cleanup report
        const report = cleaner.generateCleanupReport();
        fs.writeFileSync('utils/analysis/package-cleanup-report.json', JSON.stringify(report, null, 2));
        
        console.log('📊 CLEANUP PLAN:');
        console.log(`- Dependencies to remove: ${report.summary.totalDependenciesRemoved}`);
        console.log(`- Versions to align: ${report.summary.totalVersionsAligned}`);
        console.log(`- Dependencies to move to devDependencies: ${report.summary.totalMoved}`);
        console.log('\n📄 Detailed plan saved to: utils/analysis/package-cleanup-report.json\n');
        
        // Create backups before making changes
        console.log('📋 Creating backups...');
        const backupDir = 'utils/analysis/backups';
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const packageFiles = [
            'package.json',
            'backend/package.json',
            'client/package.json',
            'server/package.json'
        ];
        
        packageFiles.forEach(file => {
            if (fs.existsSync(file)) {
                const backupName = file.replace(/\//g, '_');
                fs.copyFileSync(file, `${backupDir}/${backupName}.backup`);
                console.log(`  ✅ Backed up ${file}`);
            }
        });
        
        console.log('\n🔧 Starting cleanup process...');
        
        // Run the cleanup
        const success = await cleaner.cleanAllPackages();
        
        if (success) {
            console.log('\n🎉 Package cleanup completed successfully!');
            console.log('\n⚠️  IMPORTANT: Please run the following commands to complete the process:');
            console.log('1. cd backend && npm install');
            console.log('2. cd client && npm install');
            console.log('3. cd server && npm install');
            console.log('4. npm install (in root directory)');
            console.log('\nThen test all services to ensure functionality is preserved.');
        } else {
            console.log('\n❌ Cleanup failed. Check the errors above.');
            console.log('Backups are available in utils/analysis/backups/ if needed.');
        }
        
    } catch (error) {
        console.error('Error during package cleanup:', error);
    }
}

if (require.main === module) {
    runPackageCleanup();
}

module.exports = { runPackageCleanup };