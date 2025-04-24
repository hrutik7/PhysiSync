import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function exportAllTables(): Promise<void> {
  // Get all model names from Prisma
  const models = Object.keys(prisma).filter((key:any) => 
    typeof prisma[key] === 'object' && 
    prisma[key] !== null &&
    !['_', '$'].includes(key[0])
  );

  for (const model of models) {
    try {
      console.log(`Exporting model: ${model}`);
      
      // Use type assertion here since we're filtering valid models
      const data = await (prisma as any)[model].findMany();
      
      // Skip if no data
      if (data.length === 0) {
        console.log(`No data for ${model}, skipping...`);
        continue;
      }
      
      // Create export directory if it doesn't exist
      const dir = path.join(__dirname, 'exports');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
      
      // Write data to JSON file
      fs.writeFileSync(
        path.join(dir, `${model}.json`),
        JSON.stringify(data, null, 2)
      );
      
      console.log(`Exported ${data.length} records from ${model}`);
    } catch (error) {
      console.error(`Error exporting ${model}:`, error);
    }
  }
}

exportAllTables()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());