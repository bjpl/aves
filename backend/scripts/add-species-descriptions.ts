import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Sample bilingual descriptions for common bird species
const speciesDescriptions = {
  // Cardinals
  'Cardinalis cardinalis': {
    spanish: 'Ave canora brillante de color rojo intenso con una cresta prominente. El macho es completamente rojo carmesí, mientras que la hembra tiene tonos más apagados de marrón rojizo. Se alimenta principalmente de semillas y frutas.',
    english: 'A brilliant songbird with intense red plumage and a prominent crest. Males are completely crimson red while females display more muted reddish-brown tones. Feeds primarily on seeds and fruits.',
  },

  // Blue Jays
  'Cyanocitta cristata': {
    spanish: 'Pájaro inteligente y ruidoso con plumaje azul brillante, blanco y negro. Conocido por su distintiva cresta y su capacidad para imitar otras aves. Se encuentra comúnmente en bosques y áreas suburbanas.',
    english: 'An intelligent and noisy bird with bright blue, white, and black plumage. Known for its distinctive crest and ability to mimic other birds. Commonly found in forests and suburban areas.',
  },

  // American Robin
  'Turdus migratorius': {
    spanish: 'Ave común de pecho rojizo-anaranjado y espalda gris. Es una de las primeras aves en cantar al amanecer. Se alimenta de lombrices, insectos y frutas. Símbolo de la primavera en Norteamérica.',
    english: 'A common bird with reddish-orange breast and gray back. One of the first birds to sing at dawn. Feeds on earthworms, insects, and fruits. Symbol of spring in North America.',
  },

  // Mallard
  'Anas platyrhynchos': {
    spanish: 'Pato común y adaptable. Los machos tienen cabeza verde brillante, pecho castaño y cuerpo gris. Las hembras son moteadas en tonos marrones. Se encuentra en lagos, estanques y ríos de todo el mundo.',
    english: 'A common and adaptable duck. Males have bright green heads, chestnut breasts, and gray bodies. Females are mottled brown. Found in lakes, ponds, and rivers worldwide.',
  },

  // Bald Eagle
  'Haliaeetus leucocephalus': {
    spanish: 'Majestuosa águila rapaz y símbolo nacional de Estados Unidos. Adultos tienen cabeza y cola blancas distintivas con cuerpo marrón oscuro. Experto pescador con vista aguda y garras poderosas.',
    english: 'Majestic bird of prey and national symbol of the United States. Adults have distinctive white head and tail with dark brown body. Expert fisher with keen eyesight and powerful talons.',
  },

  // Great Blue Heron
  'Ardea herodias': {
    spanish: 'Gran ave zancuda con plumaje azul-grisáceo. Tiene un cuello largo en forma de S y un pico amarillo afilado. Caza pacientemente peces y anfibios en aguas poco profundas.',
    english: 'Large wading bird with blue-gray plumage. Has a long S-shaped neck and sharp yellow bill. Patiently hunts fish and amphibians in shallow waters.',
  },

  // Northern Flicker
  'Colaptes auratus': {
    spanish: 'Pájaro carpintero de tamaño mediano con plumaje marrón moteado. Muestra coloridas manchas amarillas o rojas bajo las alas durante el vuelo. A menudo se alimenta en el suelo buscando hormigas.',
    english: 'Medium-sized woodpecker with spotted brown plumage. Shows colorful yellow or red wing patches during flight. Often feeds on the ground searching for ants.',
  },

  // Ruby-throated Hummingbird
  'Archilochus colubris': {
    spanish: 'Colibrí diminuto y ágil con plumaje verde iridiscente. Los machos tienen una garganta roja brillante. Puede batir sus alas hasta 80 veces por segundo mientras se alimenta de néctar.',
    english: 'Tiny, agile hummingbird with iridescent green plumage. Males have brilliant red throats. Can beat wings up to 80 times per second while feeding on nectar.',
  },

  // Common Raven
  'Corvus corax': {
    spanish: 'Ave grande e inteligente, completamente negra con brillo púrpura. Conocida por su notable inteligencia y comportamientos complejos. Tiene una llamada distintiva de "croar" profundo.',
    english: 'Large, intelligent bird that is entirely black with purple sheen. Known for remarkable intelligence and complex behaviors. Has a distinctive deep "croaking" call.',
  },

  // Barn Owl
  'Tyto alba': {
    spanish: 'Búho nocturno con cara en forma de corazón distintiva y plumaje pálido. Cazador silencioso de roedores en campos y graneros. Tiene una audición excepcional para localizar presas en la oscuridad.',
    english: 'Nocturnal owl with distinctive heart-shaped face and pale plumage. Silent hunter of rodents in fields and barns. Has exceptional hearing to locate prey in darkness.',
  },
};

async function addSpeciesDescriptions() {
  console.log('📝 Adding bilingual descriptions to species...\n');

  try {
    // First, check current state
    const checkQuery = `
      SELECT
        scientific_name,
        spanish_name,
        description_spanish IS NOT NULL as has_spanish,
        description_english IS NOT NULL as has_english
      FROM species
      ORDER BY spanish_name
    `;

    const checkResult = await pool.query(checkQuery);
    console.log(`Found ${checkResult.rows.length} species in database:`);
    checkResult.rows.forEach((row, i) => {
      console.log(`  ${i + 1}. ${row.spanish_name} (${row.scientific_name})`);
      console.log(`     Spanish desc: ${row.has_spanish ? '✅' : '❌'}, English desc: ${row.has_english ? '✅' : '❌'}`);
    });
    console.log();

    // Update species with descriptions
    let updated = 0;
    let notFound = 0;

    for (const [scientificName, descriptions] of Object.entries(speciesDescriptions)) {
      const updateQuery = `
        UPDATE species
        SET
          description_spanish = $1,
          description_english = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE scientific_name = $3
        RETURNING spanish_name, scientific_name
      `;

      const result = await pool.query(updateQuery, [
        descriptions.spanish,
        descriptions.english,
        scientificName,
      ]);

      if (result.rows.length > 0) {
        console.log(`✅ Updated: ${result.rows[0].spanish_name} (${result.rows[0].scientific_name})`);
        updated++;
      } else {
        console.log(`⚠️  Not found in database: ${scientificName}`);
        notFound++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Updated: ${updated} species`);
    console.log(`   ⚠️  Not found: ${notFound} species`);

    // Show final state
    console.log('\n📋 Final state:');
    const finalCheck = await pool.query(checkQuery);
    const withDescriptions = finalCheck.rows.filter(r => r.has_spanish && r.has_english).length;
    console.log(`   Species with bilingual descriptions: ${withDescriptions}/${finalCheck.rows.length}`);

  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addSpeciesDescriptions();
