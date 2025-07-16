const { MongoClient } = require('mongodb');
const fs = require('fs').promises;
const path = require('path');

async function testBackup() {
  console.log('🔄 Testing Vector Database Backup Functionality...');
  
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db('Cryptique-Test-Server');
  
  try {
    // Test 1: Check collections exist
    console.log('\n1. Checking collections...');
    const collections = await db.listCollections().toArray();
    const vectorCollections = collections.filter(c => 
      ['vectordocuments', 'embeddingjobs', 'embeddingstats'].includes(c.name)
    );
    
    console.log('✅ Vector collections found:');
    vectorCollections.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    
    // Test 2: Count documents
    console.log('\n2. Counting documents...');
    for (const col of vectorCollections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`   - ${col.name}: ${count} documents`);
    }
    
    // Test 3: Sample backup (export a few documents)
    console.log('\n3. Testing sample backup...');
    const sampleDocs = await db.collection('vectordocuments').find().limit(5).toArray();
    
    // Create backup directory
    const backupDir = path.join(__dirname, '../backups/test');
    await fs.mkdir(backupDir, { recursive: true });
    
    // Write sample backup
    const backupFile = path.join(backupDir, `sample_backup_${Date.now()}.json`);
    await fs.writeFile(backupFile, JSON.stringify(sampleDocs, null, 2));
    
    console.log('✅ Sample backup created successfully');
    console.log(`   - File: ${backupFile}`);
    console.log(`   - Documents: ${sampleDocs.length}`);
    
    // Test 4: Verify backup file
    console.log('\n4. Verifying backup file...');
    const backupContent = await fs.readFile(backupFile, 'utf8');
    const parsedBackup = JSON.parse(backupContent);
    
    console.log('✅ Backup file verified');
    console.log(`   - Size: ${Math.round(backupContent.length / 1024)} KB`);
    console.log(`   - Documents: ${parsedBackup.length}`);
    
    console.log('\n🎉 Backup functionality test completed successfully!');
    
  } catch (error) {
    console.error('❌ Backup test failed:', error.message);
  } finally {
    await client.close();
  }
}

testBackup().catch(console.error); 