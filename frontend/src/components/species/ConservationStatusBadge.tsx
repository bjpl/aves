import React from 'react';
import { ConservationStatus } from '../../../../shared/types/species.types';

interface ConservationStatusBadgeProps {
  status: ConservationStatus;
  scientificName: string;
}

interface ConservationInfo {
  color: string;
  label: string;
  description: string;
  learnMoreUrl: string;
  helpUrl?: string;
  showHelpLink: boolean;
}

export const ConservationStatusBadge: React.FC<ConservationStatusBadgeProps> = ({
  status,
  scientificName
}) => {
  const getConservationInfo = (status: ConservationStatus): ConservationInfo => {
    // Encode scientific name for URLs
    const encodedName = encodeURIComponent(scientificName);
    const iucnBaseUrl = 'https://www.iucnredlist.org';
    const iucnSearchUrl = `${iucnBaseUrl}/search?query=${encodedName}&searchType=species`;

    const info: Record<ConservationStatus, ConservationInfo> = {
      'LC': {
        color: 'bg-green-100 text-green-800 border-green-300',
        label: 'Least Concern',
        description: 'Population is stable and widespread',
        learnMoreUrl: `https://ebird.org/species/${encodedName}`,
        showHelpLink: false,
      },
      'NT': {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        label: 'Near Threatened',
        description: 'May become threatened in the near future',
        learnMoreUrl: iucnSearchUrl,
        helpUrl: iucnBaseUrl,
        showHelpLink: true,
      },
      'VU': {
        color: 'bg-orange-100 text-orange-800 border-orange-300',
        label: 'Vulnerable',
        description: 'High risk of endangerment in the wild',
        learnMoreUrl: iucnSearchUrl,
        helpUrl: 'https://www.worldwildlife.org/species/directory?direction=desc&sort=extinction_status',
        showHelpLink: true,
      },
      'EN': {
        color: 'bg-red-100 text-red-800 border-red-300',
        label: 'Endangered',
        description: 'Very high risk of extinction',
        learnMoreUrl: iucnSearchUrl,
        helpUrl: 'https://www.worldwildlife.org/initiatives/wildlife-conservation',
        showHelpLink: true,
      },
      'CR': {
        color: 'bg-red-200 text-red-900 border-red-400',
        label: 'Critically Endangered',
        description: 'Extremely high risk of extinction',
        learnMoreUrl: iucnSearchUrl,
        helpUrl: 'https://www.worldwildlife.org/initiatives/wildlife-conservation',
        showHelpLink: true,
      },
      'EW': {
        color: 'bg-purple-100 text-purple-800 border-purple-300',
        label: 'Extinct in the Wild',
        description: 'Only survives in captivity',
        learnMoreUrl: iucnSearchUrl,
        helpUrl: 'https://www.worldwildlife.org/initiatives/wildlife-conservation',
        showHelpLink: true,
      },
      'EX': {
        color: 'bg-gray-200 text-gray-900 border-gray-400',
        label: 'Extinct',
        description: 'No known individuals remaining',
        learnMoreUrl: iucnSearchUrl,
        showHelpLink: false,
      },
    };

    return info[status];
  };

  const conservationInfo = getConservationInfo(status);

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Conservation Status
      </h3>

      {/* Status Badge */}
      <div className={`inline-flex items-center px-4 py-2 rounded-lg border-2 ${conservationInfo.color}`}>
        <span className="font-bold">{status}</span>
        <span className="mx-2">-</span>
        <span className="font-medium">{conservationInfo.label}</span>
      </div>

      {/* Description */}
      {conservationInfo.description && (
        <p className="text-sm text-gray-600 mt-2">{conservationInfo.description}</p>
      )}

      {/* Action Links */}
      <div className="mt-3 flex flex-wrap gap-2">
        {/* Learn More Link */}
        <a
          href={conservationInfo.learnMoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
        >
          <svg
            className="w-4 h-4 mr-1.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Learn More
          <svg
            className="w-3 h-3 ml-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>

        {/* How to Help Link (for threatened species) */}
        {conservationInfo.showHelpLink && conservationInfo.helpUrl && (
          <a
            href={conservationInfo.helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
          >
            <svg
              className="w-4 h-4 mr-1.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            How to Help
            <svg
              className="w-3 h-3 ml-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        )}
      </div>

      {/* Threatened Species Alert */}
      {conservationInfo.showHelpLink && (
        <div className="mt-3 p-3 bg-amber-50 border-l-4 border-amber-400 rounded">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">⚠️ This species needs protection.</span>
            {' '}Learn about conservation efforts and how you can help preserve this species for future generations.
          </p>
        </div>
      )}
    </div>
  );
};
