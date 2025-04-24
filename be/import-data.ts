import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface Record {
  [key: string]: any;
}

async function importAllTables(): Promise<void> {
  const dir = path.join(__dirname, 'exports');
  
  // Check if export directory exists
  if (!fs.existsSync(dir)) {
    console.error('Export directory not found. Please run export script first.');
    return;
  }
  
  // Read all export files
  const files = fs.readdirSync(dir).filter(file => file.endsWith('.json'));
  
  for (const file of files) {
    const modelName = file.replace('.json', '');
    
    // Check if model exists in Prisma client
    if (!(prisma as any)[modelName]) {
      console.log(`Model ${modelName} not found in Prisma client, skipping...`);
      continue;
    }
    
    try {
      console.log(`Importing data for model: ${modelName}`);
      
      // Read data from JSON file
      const data: Record[] = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      
      // Skip if no data
      if (data.length === 0) {
        console.log(`No data for ${modelName}, skipping...`);
        continue;
      }
      
      // Import data in batches to avoid timeouts
      const batchSize = 100;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        // Create records one by one to handle potential conflicts
        for (const record of batch) {
          try {
            await (prisma as any)[modelName].create({
              data: record
            });
          } catch (error) {
            console.error(`Error importing record in ${modelName}:`, error);
            console.error('Record:', JSON.stringify(record, null, 2).substring(0, 200) + '...');
          }
        }
        
        console.log(`Imported batch ${Math.floor(i/batchSize) + 1} for ${modelName}`);
      }
      
      console.log(`Imported ${data.length} records to ${modelName}`);
    } catch (error) {
      console.error(`Error importing ${modelName}:`, error);
    }
  }
}

importAllTables()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());