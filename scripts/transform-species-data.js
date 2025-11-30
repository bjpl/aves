#!/usr/bin/env node

/**
 * Transform species.json data to match the Species TypeScript interface
 * Maps: commonNameEnglish -> englishName, commonNameSpanish -> spanishName
 * Maps: imageUrl -> primaryImageUrl, habitat -> habitats, colors -> primaryColors
 */

const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../frontend/public/data/species.json');
const outputFile = path.join(__dirname, '../frontend/public/data/species.json');

console.log('Reading species data...');
const rawData = fs.readFileSync(inputFile, 'utf8');
const species = JSON.parse(rawData);

console.log(`Transforming ${species.length} species records...`);

const transformed = species.map(sp => ({
  id: sp.id,
  scientificName: sp.scientificName,
  spanishName: sp.commonNameSpanish || sp.spanishName || '',
  englishName: sp.commonNameEnglish || sp.englishName || '',
  orderName: sp.order || sp.orderName || '',
  familyName: sp.family || sp.familyName || '',
  genus: sp.genus || '',
  sizeCategory: sp.size || sp.sizeCategory || 'medium',
  primaryColors: sp.colors || sp.primaryColors || [],
  habitats: Array.isArray(sp.habitat) ? sp.habitat : (sp.habitats || []),
  conservationStatus: sp.conservationStatus || 'LC',
  descriptionSpanish: sp.descriptionSpanish || sp.description || '',
  descriptionEnglish: sp.descriptionEnglish || sp.description || '',
  funFact: sp.funFact || '',
  primaryImageUrl: sp.imageUrl || sp.primaryImageUrl || sp.thumbnailUrl || '',
  annotationCount: sp.annotationCount || 0
}));

console.log('Writing transformed data...');
fs.writeFileSync(outputFile, JSON.stringify(transformed, null, 2));

console.log('✅ Species data transformed successfully!');
console.log(`   Output: ${outputFile}`);
console.log(`   Records: ${transformed.length}`);
