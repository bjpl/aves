import React from 'react';
import { render, screen } from '@testing-library/react';
import { ConservationStatusBadge } from '../../../components/species/ConservationStatusBadge';
import { ConservationStatus } from '../../../../../shared/types/species.types';

describe('ConservationStatusBadge', () => {
  const scientificName = 'Aquila chrysaetos';

  it('renders LC status with eBird link', () => {
    render(<ConservationStatusBadge status="LC" scientificName={scientificName} />);

    expect(screen.getByText('LC')).toBeInTheDocument();
    expect(screen.getByText('Least Concern')).toBeInTheDocument();
    expect(screen.getByText('Population is stable and widespread')).toBeInTheDocument();

    const learnMoreLink = screen.getByText('Learn More').closest('a');
    expect(learnMoreLink).toHaveAttribute('href', expect.stringContaining('ebird.org'));
    expect(learnMoreLink).toHaveAttribute('target', '_blank');

    // LC should not show "How to Help" link
    expect(screen.queryByText('How to Help')).not.toBeInTheDocument();
  });

  it('renders NT status with IUCN link and help option', () => {
    render(<ConservationStatusBadge status="NT" scientificName={scientificName} />);

    expect(screen.getByText('NT')).toBeInTheDocument();
    expect(screen.getByText('Near Threatened')).toBeInTheDocument();

    const learnMoreLink = screen.getByText('Learn More').closest('a');
    expect(learnMoreLink).toHaveAttribute('href', expect.stringContaining('iucnredlist.org'));

    const helpLink = screen.getByText('How to Help').closest('a');
    expect(helpLink).toBeInTheDocument();
    expect(helpLink).toHaveAttribute('target', '_blank');

    // Should show threatened species alert
    expect(screen.getByText(/This species needs protection/)).toBeInTheDocument();
  });

  it('renders VU status with conservation links', () => {
    render(<ConservationStatusBadge status="VU" scientificName={scientificName} />);

    expect(screen.getByText('VU')).toBeInTheDocument();
    expect(screen.getByText('Vulnerable')).toBeInTheDocument();
    expect(screen.getByText('High risk of endangerment in the wild')).toBeInTheDocument();

    const learnMoreLink = screen.getByText('Learn More').closest('a');
    expect(learnMoreLink).toHaveAttribute('href', expect.stringContaining('iucnredlist.org'));

    const helpLink = screen.getByText('How to Help').closest('a');
    expect(helpLink).toBeInTheDocument();
    expect(helpLink).toHaveAttribute('href', expect.stringContaining('worldwildlife.org'));
  });

  it('renders EN status with WWF link', () => {
    render(<ConservationStatusBadge status="EN" scientificName={scientificName} />);

    expect(screen.getByText('EN')).toBeInTheDocument();
    expect(screen.getByText('Endangered')).toBeInTheDocument();
    expect(screen.getByText('Very high risk of extinction')).toBeInTheDocument();

    const helpLink = screen.getByText('How to Help').closest('a');
    expect(helpLink).toHaveAttribute('href', expect.stringContaining('worldwildlife.org'));
  });

  it('renders CR status with urgent conservation messaging', () => {
    render(<ConservationStatusBadge status="CR" scientificName={scientificName} />);

    expect(screen.getByText('CR')).toBeInTheDocument();
    expect(screen.getByText('Critically Endangered')).toBeInTheDocument();
    expect(screen.getByText('Extremely high risk of extinction')).toBeInTheDocument();

    // Should show threatened species alert
    expect(screen.getByText(/This species needs protection/)).toBeInTheDocument();
  });

  it('encodes scientific name in URLs correctly', () => {
    const nameWithSpace = 'Passer domesticus';
    render(<ConservationStatusBadge status="LC" scientificName={nameWithSpace} />);

    const learnMoreLink = screen.getByText('Learn More').closest('a');
    expect(learnMoreLink).toHaveAttribute('href', expect.stringContaining('Passer%20domesticus'));
  });

  it('renders all external links with proper attributes', () => {
    render(<ConservationStatusBadge status="VU" scientificName={scientificName} />);

    const links = screen.getAllByRole('link');
    links.forEach(link => {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  it.each<ConservationStatus>(['LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX'])(
    'renders %s status correctly',
    (status) => {
      const { container } = render(
        <ConservationStatusBadge status={status} scientificName={scientificName} />
      );

      expect(screen.getByText(status)).toBeInTheDocument();
      expect(container.querySelector('.inline-flex')).toBeInTheDocument();
    }
  );
});
