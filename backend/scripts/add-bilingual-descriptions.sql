-- Add bilingual descriptions to species
-- Run with: psql $DATABASE_URL -f scripts/add-bilingual-descriptions.sql

-- Cardinal
UPDATE species
SET
  description_spanish = 'Ave canora brillante de color rojo intenso con una cresta prominente. El macho es completamente rojo carmesí, mientras que la hembra tiene tonos más apagados de marrón rojizo. Se alimenta principalmente de semillas y frutas.',
  description_english = 'A brilliant songbird with intense red plumage and a prominent crest. Males are completely crimson red while females display more muted reddish-brown tones. Feeds primarily on seeds and fruits.',
  updated_at = CURRENT_TIMESTAMP
WHERE scientific_name = 'Cardinalis cardinalis';

-- Blue Jay
UPDATE species
SET
  description_spanish = 'Pájaro inteligente y ruidoso con plumaje azul brillante, blanco y negro. Conocido por su distintiva cresta y su capacidad para imitar otras aves. Se encuentra comúnmente en bosques y áreas suburbanas.',
  description_english = 'An intelligent and noisy bird with bright blue, white, and black plumage. Known for its distinctive crest and ability to mimic other birds. Commonly found in forests and suburban areas.',
  updated_at = CURRENT_TIMESTAMP
WHERE scientific_name = 'Cyanocitta cristata';

-- American Robin
UPDATE species
SET
  description_spanish = 'Ave común de pecho rojizo-anaranjado y espalda gris. Es una de las primeras aves en cantar al amanecer. Se alimenta de lombrices, insectos y frutas. Símbolo de la primavera en Norteamérica.',
  description_english = 'A common bird with reddish-orange breast and gray back. One of the first birds to sing at dawn. Feeds on earthworms, insects, and fruits. Symbol of spring in North America.',
  updated_at = CURRENT_TIMESTAMP
WHERE scientific_name = 'Turdus migratorius';

-- Mallard
UPDATE species
SET
  description_spanish = 'Pato común y adaptable. Los machos tienen cabeza verde brillante, pecho castaño y cuerpo gris. Las hembras son moteadas en tonos marrones. Se encuentra en lagos, estanques y ríos de todo el mundo.',
  description_english = 'A common and adaptable duck. Males have bright green heads, chestnut breasts, and gray bodies. Females are mottled brown. Found in lakes, ponds, and rivers worldwide.',
  updated_at = CURRENT_TIMESTAMP
WHERE scientific_name = 'Anas platyrhynchos';

-- Bald Eagle
UPDATE species
SET
  description_spanish = 'Majestuosa águila rapaz y símbolo nacional de Estados Unidos. Adultos tienen cabeza y cola blancas distintivas con cuerpo marrón oscuro. Experto pescador con vista aguda y garras poderosas.',
  description_english = 'Majestic bird of prey and national symbol of the United States. Adults have distinctive white head and tail with dark brown body. Expert fisher with keen eyesight and powerful talons.',
  updated_at = CURRENT_TIMESTAMP
WHERE scientific_name = 'Haliaeetus leucocephalus';

-- Great Blue Heron
UPDATE species
SET
  description_spanish = 'Gran ave zancuda con plumaje azul-grisáceo. Tiene un cuello largo en forma de S y un pico amarillo afilado. Caza pacientemente peces y anfibios en aguas poco profundas.',
  description_english = 'Large wading bird with blue-gray plumage. Has a long S-shaped neck and sharp yellow bill. Patiently hunts fish and amphibians in shallow waters.',
  updated_at = CURRENT_TIMESTAMP
WHERE scientific_name = 'Ardea herodias';

-- Northern Flicker
UPDATE species
SET
  description_spanish = 'Pájaro carpintero de tamaño mediano con plumaje marrón moteado. Muestra coloridas manchas amarillas o rojas bajo las alas durante el vuelo. A menudo se alimenta en el suelo buscando hormigas.',
  description_english = 'Medium-sized woodpecker with spotted brown plumage. Shows colorful yellow or red wing patches during flight. Often feeds on the ground searching for ants.',
  updated_at = CURRENT_TIMESTAMP
WHERE scientific_name = 'Colaptes auratus';

-- Ruby-throated Hummingbird
UPDATE species
SET
  description_spanish = 'Colibrí diminuto y ágil con plumaje verde iridiscente. Los machos tienen una garganta roja brillante. Puede batir sus alas hasta 80 veces por segundo mientras se alimenta de néctar.',
  description_english = 'Tiny, agile hummingbird with iridescent green plumage. Males have brilliant red throats. Can beat wings up to 80 times per second while feeding on nectar.',
  updated_at = CURRENT_TIMESTAMP
WHERE scientific_name = 'Archilochus colubris';

-- Common Raven
UPDATE species
SET
  description_spanish = 'Ave grande e inteligente, completamente negra con brillo púrpura. Conocida por su notable inteligencia y comportamientos complejos. Tiene una llamada distintiva de "croar" profundo.',
  description_english = 'Large, intelligent bird that is entirely black with purple sheen. Known for remarkable intelligence and complex behaviors. Has a distinctive deep "croaking" call.',
  updated_at = CURRENT_TIMESTAMP
WHERE scientific_name = 'Corvus corax';

-- Barn Owl
UPDATE species
SET
  description_spanish = 'Búho nocturno con cara en forma de corazón distintiva y plumaje pálido. Cazador silencioso de roedores en campos y graneros. Tiene una audición excepcional para localizar presas en la oscuridad.',
  description_english = 'Nocturnal owl with distinctive heart-shaped face and pale plumage. Silent hunter of rodents in fields and barns. Has exceptional hearing to locate prey in darkness.',
  updated_at = CURRENT_TIMESTAMP
WHERE scientific_name = 'Tyto alba';

-- Show results
SELECT
  spanish_name,
  english_name,
  scientific_name,
  CASE
    WHEN description_spanish IS NOT NULL AND description_english IS NOT NULL THEN '✅ Both'
    WHEN description_spanish IS NOT NULL THEN '🇪🇸 Spanish only'
    WHEN description_english IS NOT NULL THEN '🇬🇧 English only'
    ELSE '❌ None'
  END as description_status
FROM species
ORDER BY spanish_name;
