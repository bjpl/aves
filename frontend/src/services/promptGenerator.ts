import { Species } from '../../../shared/types/species.types';

export class PromptGenerator {
  generateMidjourneyPrompt(species: Species): string {
    const parts: string[] = [];

    // Base style
    parts.push('professional wildlife photography');

    // Species name
    parts.push(species.englishName);

    // Visual characteristics
    if (species.primaryColors && species.primaryColors.length > 0) {
      const colorDesc = species.primaryColors.slice(0, 3).join(' and ');
      parts.push(`${colorDesc} plumage`);
    }

    // Size descriptor
    const sizeDescriptors = {
      small: 'small delicate',
      medium: 'medium-sized',
      large: 'large majestic'
    };
    if (species.sizeCategory) {
      parts.push(sizeDescriptors[species.sizeCategory]);
    }

    // Habitat context
    if (species.habitats && species.habitats.length > 0) {
      const habitat = species.habitats[0];
      const habitatDescriptors: Record<string, string> = {
        forest: 'in lush forest setting',
        wetland: 'near tranquil wetland',
        coastal: 'along coastal shore',
        mountain: 'in mountain landscape',
        urban: 'in urban environment',
        agricultural: 'in pastoral farmland',
        garden: 'in garden setting'
      };
      parts.push(habitatDescriptors[habitat] || `in ${habitat} habitat`);
    }

    // Photography technical details
    parts.push('sharp focus on bird');
    parts.push('bokeh background');
    parts.push('golden hour lighting');
    parts.push('high detail');
    parts.push('4k quality');
    parts.push('national geographic style');

    // Negative prompts (what to avoid)
    const negative = '--no cartoon illustration drawing painting artistic';

    return `${parts.join(', ')} ${negative}`;
  }

  generateDallEPrompt(species: Species): string {
    const parts: string[] = [];

    // More descriptive for DALL-E
    parts.push('A realistic photograph of');
    parts.push(`a ${species.englishName}`);

    if (species.primaryColors && species.primaryColors.length > 0) {
      parts.push(`with ${species.primaryColors.slice(0, 2).join(' and ')} feathers`);
    }

    if (species.habitats && species.habitats.length > 0) {
      parts.push(`in its natural ${species.habitats[0]} habitat`);
    }

    parts.push('professional wildlife photography');
    parts.push('high quality');
    parts.push('detailed');

    return parts.join(' ');
  }

  generateSearchQueries(species: Species): string[] {
    const queries: string[] = [];

    // Scientific name
    queries.push(species.scientificName);

    // English name variations
    queries.push(`${species.englishName} bird`);
    queries.push(`${species.englishName} wildlife`);

    // Spanish name if different
    if (species.spanishName !== species.englishName) {
      queries.push(`${species.spanishName} ave`);
    }

    // Family/order for rare species
    queries.push(`${species.familyName} bird`);

    return queries;
  }

  generatePlaceholderDescription(species: Species): string {
    const parts: string[] = [];

    parts.push(`The ${species.englishName} (${species.scientificName})`);

    if (species.sizeCategory) {
      parts.push(`is a ${species.sizeCategory}-sized bird`);
    }

    if (species.familyName) {
      parts.push(`from the ${species.familyName} family`);
    }

    if (species.primaryColors && species.primaryColors.length > 0) {
      parts.push(`with ${species.primaryColors.slice(0, 2).join(' and ')} coloring`);
    }

    if (species.habitats && species.habitats.length > 0) {
      parts.push(`typically found in ${species.habitats.slice(0, 2).join(' and ')} habitats`);
    }

    return parts.join(' ') + '.';
  }
}

export const promptGenerator = new PromptGenerator();