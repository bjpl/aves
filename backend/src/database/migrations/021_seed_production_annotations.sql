-- Migration 021: Seed Production Annotations
-- CONCEPT: Pre-populate the annotations table with vocabulary annotations for existing images
-- WHY: Learn and Practice pages require approved annotations linked to images
-- NOTE: These annotations link to images seeded in migration 020

-- ============================================================================
-- HELPER: Get image IDs for each species
-- ============================================================================

-- Insert annotations for Northern Cardinal images
DO $$
DECLARE
  v_image_id UUID;
BEGIN
  -- Get first Northern Cardinal image
  SELECT i.id INTO v_image_id
  FROM images i
  JOIN species s ON i.species_id = s.id
  WHERE s.english_name = 'Northern Cardinal'
  LIMIT 1;

  IF v_image_id IS NOT NULL THEN
    -- Anatomical: Crest
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.35, "y": 0.08, "width": 0.2, "height": 0.15}', 'anatomical', 'la cresta', 'crest', 'lah KREHS-tah', 1, true)
    ON CONFLICT DO NOTHING;

    -- Anatomical: Beak
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.4, "y": 0.22, "width": 0.12, "height": 0.1}', 'anatomical', 'el pico', 'beak', 'el PEE-koh', 1, true)
    ON CONFLICT DO NOTHING;

    -- Color: Red feathers
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.25, "y": 0.3, "width": 0.45, "height": 0.4}', 'color', 'las plumas rojas', 'red feathers', 'lahs PLOO-mahs ROH-hahs', 2, true)
    ON CONFLICT DO NOTHING;

    -- Anatomical: Black mask
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.35, "y": 0.18, "width": 0.2, "height": 0.12}', 'anatomical', 'la máscara negra', 'black mask', 'lah MAHS-kah NEH-grah', 2, true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Insert annotations for Blue Jay images
DO $$
DECLARE
  v_image_id UUID;
BEGIN
  SELECT i.id INTO v_image_id
  FROM images i
  JOIN species s ON i.species_id = s.id
  WHERE s.english_name = 'Blue Jay'
  LIMIT 1;

  IF v_image_id IS NOT NULL THEN
    -- Color: Blue feathers
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.2, "y": 0.25, "width": 0.5, "height": 0.4}', 'color', 'las plumas azules', 'blue feathers', 'lahs PLOO-mahs ah-SOO-lehs', 1, true)
    ON CONFLICT DO NOTHING;

    -- Anatomical: Crest
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.35, "y": 0.05, "width": 0.2, "height": 0.18}', 'anatomical', 'la cresta azul', 'blue crest', 'lah KREHS-tah ah-SOOL', 2, true)
    ON CONFLICT DO NOTHING;

    -- Pattern: White markings
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.3, "y": 0.35, "width": 0.3, "height": 0.2}', 'pattern', 'las marcas blancas', 'white markings', 'lahs MAHR-kahs BLAHN-kahs', 2, true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Insert annotations for Bald Eagle images
DO $$
DECLARE
  v_image_id UUID;
BEGIN
  SELECT i.id INTO v_image_id
  FROM images i
  JOIN species s ON i.species_id = s.id
  WHERE s.english_name = 'Bald Eagle'
  LIMIT 1;

  IF v_image_id IS NOT NULL THEN
    -- Color: White head
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.25, "y": 0.05, "width": 0.4, "height": 0.3}', 'color', 'la cabeza blanca', 'white head', 'lah kah-BEH-sah BLAHN-kah', 1, true)
    ON CONFLICT DO NOTHING;

    -- Anatomical: Curved beak
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.4, "y": 0.2, "width": 0.15, "height": 0.12}', 'anatomical', 'el pico curvo', 'curved beak', 'el PEE-koh KOOR-boh', 2, true)
    ON CONFLICT DO NOTHING;

    -- Anatomical: Sharp eyes
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.35, "y": 0.15, "width": 0.12, "height": 0.08}', 'anatomical', 'los ojos agudos', 'sharp eyes', 'lohs OH-hohs ah-GOO-dohs', 2, true)
    ON CONFLICT DO NOTHING;

    -- Anatomical: Talons
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.3, "y": 0.7, "width": 0.25, "height": 0.2}', 'anatomical', 'las garras', 'talons', 'lahs GAH-rrahs', 3, true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Insert annotations for Ruby-throated Hummingbird images
DO $$
DECLARE
  v_image_id UUID;
BEGIN
  SELECT i.id INTO v_image_id
  FROM images i
  JOIN species s ON i.species_id = s.id
  WHERE s.english_name = 'Ruby-throated Hummingbird'
  LIMIT 1;

  IF v_image_id IS NOT NULL THEN
    -- Color: Ruby throat
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.35, "y": 0.25, "width": 0.2, "height": 0.15}', 'color', 'la garganta de rubí', 'ruby throat', 'lah gahr-GAHN-tah deh roo-BEE', 2, true)
    ON CONFLICT DO NOTHING;

    -- Anatomical: Long beak
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.45, "y": 0.2, "width": 0.25, "height": 0.08}', 'anatomical', 'el pico largo', 'long beak', 'el PEE-koh LAHR-goh', 1, true)
    ON CONFLICT DO NOTHING;

    -- Anatomical: Fast wings
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.15, "y": 0.3, "width": 0.35, "height": 0.25}', 'anatomical', 'las alas rápidas', 'fast wings', 'lahs AH-lahs RAH-pee-dahs', 2, true)
    ON CONFLICT DO NOTHING;

    -- Behavioral: Hover
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.2, "y": 0.2, "width": 0.5, "height": 0.5}', 'behavioral', 'volar en el lugar', 'hover in place', 'boh-LAHR ehn el loo-GAHR', 3, true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Insert annotations for American Robin images
DO $$
DECLARE
  v_image_id UUID;
BEGIN
  SELECT i.id INTO v_image_id
  FROM images i
  JOIN species s ON i.species_id = s.id
  WHERE s.english_name = 'American Robin'
  LIMIT 1;

  IF v_image_id IS NOT NULL THEN
    -- Color: Orange breast
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.3, "y": 0.4, "width": 0.35, "height": 0.3}', 'color', 'el pecho anaranjado', 'orange breast', 'el PEH-choh ah-nah-rahn-HAH-doh', 1, true)
    ON CONFLICT DO NOTHING;

    -- Anatomical: Yellow beak
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.42, "y": 0.22, "width": 0.12, "height": 0.08}', 'anatomical', 'el pico amarillo', 'yellow beak', 'el PEE-koh ah-mah-REE-yoh', 2, true)
    ON CONFLICT DO NOTHING;

    -- Behavioral: Pulling worms
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.35, "y": 0.7, "width": 0.25, "height": 0.2}', 'behavioral', 'buscar gusanos', 'search for worms', 'boos-KAHR goo-SAH-nohs', 3, true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Insert annotations for Great Blue Heron images
DO $$
DECLARE
  v_image_id UUID;
BEGIN
  SELECT i.id INTO v_image_id
  FROM images i
  JOIN species s ON i.species_id = s.id
  WHERE s.english_name = 'Great Blue Heron'
  LIMIT 1;

  IF v_image_id IS NOT NULL THEN
    -- Anatomical: Long neck
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.35, "y": 0.15, "width": 0.15, "height": 0.4}', 'anatomical', 'el cuello largo', 'long neck', 'el KWEH-yoh LAHR-goh', 1, true)
    ON CONFLICT DO NOTHING;

    -- Anatomical: Long legs
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.3, "y": 0.6, "width": 0.2, "height": 0.35}', 'anatomical', 'las patas largas', 'long legs', 'lahs PAH-tahs LAHR-gahs', 1, true)
    ON CONFLICT DO NOTHING;

    -- Color: Blue-gray feathers
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.25, "y": 0.3, "width": 0.4, "height": 0.3}', 'color', 'las plumas gris azulado', 'blue-gray feathers', 'lahs PLOO-mahs grees ah-soo-LAH-doh', 2, true)
    ON CONFLICT DO NOTHING;

    -- Anatomical: Sharp beak
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.45, "y": 0.12, "width": 0.2, "height": 0.08}', 'anatomical', 'el pico afilado', 'sharp beak', 'el PEE-koh ah-fee-LAH-doh', 2, true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Insert annotations for House Sparrow images
DO $$
DECLARE
  v_image_id UUID;
BEGIN
  SELECT i.id INTO v_image_id
  FROM images i
  JOIN species s ON i.species_id = s.id
  WHERE s.english_name = 'House Sparrow'
  LIMIT 1;

  IF v_image_id IS NOT NULL THEN
    -- Color: Brown feathers
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.25, "y": 0.25, "width": 0.4, "height": 0.35}', 'color', 'las plumas cafés', 'brown feathers', 'lahs PLOO-mahs kah-FEHS', 1, true)
    ON CONFLICT DO NOTHING;

    -- Anatomical: Small beak
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.42, "y": 0.2, "width": 0.1, "height": 0.08}', 'anatomical', 'el pico pequeño', 'small beak', 'el PEE-koh peh-KEH-nyoh', 1, true)
    ON CONFLICT DO NOTHING;

    -- Pattern: Black throat patch (male)
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.35, "y": 0.28, "width": 0.15, "height": 0.12}', 'pattern', 'la mancha negra', 'black throat patch', 'lah MAHN-chah NEH-grah', 2, true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Insert annotations for Mourning Dove images
DO $$
DECLARE
  v_image_id UUID;
BEGIN
  SELECT i.id INTO v_image_id
  FROM images i
  JOIN species s ON i.species_id = s.id
  WHERE s.english_name = 'Mourning Dove'
  LIMIT 1;

  IF v_image_id IS NOT NULL THEN
    -- Anatomical: Pointed tail
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.55, "y": 0.5, "width": 0.25, "height": 0.15}', 'anatomical', 'la cola puntiaguda', 'pointed tail', 'lah KOH-lah poon-tee-ah-GOO-dah', 2, true)
    ON CONFLICT DO NOTHING;

    -- Color: Grayish-brown
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.25, "y": 0.25, "width": 0.4, "height": 0.35}', 'color', 'el plumaje gris-café', 'grayish-brown plumage', 'el ploo-MAH-heh grees kah-FEH', 2, true)
    ON CONFLICT DO NOTHING;

    -- Behavioral: Cooing
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.35, "y": 0.25, "width": 0.2, "height": 0.15}', 'behavioral', 'arrullar', 'to coo', 'ah-rroo-YAHR', 3, true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Insert annotations for American Goldfinch images
DO $$
DECLARE
  v_image_id UUID;
BEGIN
  SELECT i.id INTO v_image_id
  FROM images i
  JOIN species s ON i.species_id = s.id
  WHERE s.english_name = 'American Goldfinch'
  LIMIT 1;

  IF v_image_id IS NOT NULL THEN
    -- Color: Bright yellow
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.25, "y": 0.2, "width": 0.4, "height": 0.4}', 'color', 'el amarillo brillante', 'bright yellow', 'el ah-mah-REE-yoh bree-YAHN-teh', 1, true)
    ON CONFLICT DO NOTHING;

    -- Anatomical: Black cap (male)
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.35, "y": 0.08, "width": 0.2, "height": 0.12}', 'anatomical', 'la corona negra', 'black cap', 'lah koh-ROH-nah NEH-grah', 2, true)
    ON CONFLICT DO NOTHING;

    -- Pattern: Black wings with white bars
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.2, "y": 0.35, "width": 0.25, "height": 0.2}', 'pattern', 'las alas negras con barras', 'black wings with bars', 'lahs AH-lahs NEH-grahs kohn BAH-rrahs', 3, true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Insert annotations for Red-winged Blackbird images
DO $$
DECLARE
  v_image_id UUID;
BEGIN
  SELECT i.id INTO v_image_id
  FROM images i
  JOIN species s ON i.species_id = s.id
  WHERE s.english_name = 'Red-winged Blackbird'
  LIMIT 1;

  IF v_image_id IS NOT NULL THEN
    -- Color: Red and yellow shoulder patch
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.2, "y": 0.3, "width": 0.15, "height": 0.12}', 'color', 'la charretera roja', 'red shoulder patch', 'lah chah-rreh-TEH-rah ROH-hah', 1, true)
    ON CONFLICT DO NOTHING;

    -- Color: Black plumage
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.25, "y": 0.2, "width": 0.4, "height": 0.45}', 'color', 'el plumaje negro', 'black plumage', 'el ploo-MAH-heh NEH-groh', 1, true)
    ON CONFLICT DO NOTHING;

    -- Behavioral: Singing on perch
    INSERT INTO annotations (image_id, bounding_box, annotation_type, spanish_term, english_term, pronunciation, difficulty_level, is_visible)
    VALUES (v_image_id, '{"x": 0.3, "y": 0.15, "width": 0.25, "height": 0.2}', 'behavioral', 'cantar desde una percha', 'sing from a perch', 'kahn-TAHR DEHS-deh OO-nah PEHR-chah', 3, true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify annotations were created:
-- SELECT
--   s.english_name as species,
--   COUNT(a.id) as annotation_count
-- FROM species s
-- JOIN images i ON i.species_id = s.id
-- JOIN annotations a ON a.image_id = i.id
-- WHERE a.is_visible = true
-- GROUP BY s.english_name
-- ORDER BY annotation_count DESC;
