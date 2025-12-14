import React, { useState, useEffect } from 'react';
import { AnnotationPreviewModal } from './AnnotationPreviewModal';

interface Annotation {
  id: string;
  imageUrl: string;
  spanishTerm: string;
  englishTerm: string;
  type: string;
  species: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
    shape?: 'rectangle' | 'polygon';
  };
  pronunciation?: string;
  difficultyLevel?: number;
}

interface Module {
  id: string;
  name: string;
  description: string;
}

const AnnotationPublishingPanel: React.FC = () => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<number>(1);
  const [speciesFilter, setSpeciesFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewAnnotation, setPreviewAnnotation] = useState<Annotation | null>(null);

  // Fetch approved but unpublished annotations
  useEffect(() => {
    const fetchAnnotations = async () => {
      setFetchingData(true);
      setError(null);
      try {
        const response = await fetch('/api/annotations?status=approved&published=false');
        if (!response.ok) {
          throw new Error(`Failed to fetch annotations: ${response.statusText}`);
        }
        const data = await response.json();
        setAnnotations(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch annotations';
        setError(message);
        alert(`Error: ${message}`);
      } finally {
        setFetchingData(false);
      }
    };

    fetchAnnotations();
  }, []);

  // Fetch available modules
  useEffect(() => {
    const fetchModules = async () => {
      try {
        const response = await fetch('/api/content/modules');
        if (!response.ok) {
          throw new Error(`Failed to fetch modules: ${response.statusText}`);
        }
        const data = await response.json();
        setModules(data);
        // Set first module as default if available
        if (data.length > 0) {
          setSelectedModule(data[0].id);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch modules';
        console.error(message);
        alert(`Error: ${message}`);
      }
    };

    fetchModules();
  }, []);

  // Get unique species for filter dropdown
  const uniqueSpecies = Array.from(new Set(annotations.map(a => a.species))).sort();

  // Filter annotations by species
  const filteredAnnotations = speciesFilter === 'all'
    ? annotations
    : annotations.filter(a => a.species === speciesFilter);

  // Handle individual checkbox toggle
  const handleToggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Handle select all / deselect all
  const handleToggleAll = () => {
    if (selectedIds.size === filteredAnnotations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAnnotations.map(a => a.id)));
    }
  };

  // Handle publish selected annotations
  const handlePublish = async () => {
    if (selectedIds.size === 0) {
      alert('Please select at least one annotation to publish');
      return;
    }

    if (!selectedModule) {
      alert('Please select a module');
      return;
    }

    const confirmed = window.confirm(
      `Publish ${selectedIds.size} annotation(s) to module "${modules.find(m => m.id === selectedModule)?.name}" with difficulty level ${selectedDifficulty}?`
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/content/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          annotationIds: Array.from(selectedIds),
          moduleId: selectedModule,
          difficulty: selectedDifficulty,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to publish: ${response.statusText}`);
      }

      const result = await response.json();

      // Show success message
      alert(`Successfully published ${selectedIds.size} annotation(s)!`);

      // Remove published annotations from the list
      setAnnotations(prev => prev.filter(a => !selectedIds.has(a.id)));
      setSelectedIds(new Set());

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to publish annotations';
      setError(message);
      alert(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) {
    return (
      <div className="annotation-publishing-panel">
        <div className="loading-state">
          <p>Loading annotations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="annotation-publishing-panel">
      <h2>Publish Annotations to Learn/Practice</h2>

      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Controls Section */}
      <div className="controls-section" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Species Filter */}
        <div className="filter-group">
          <label htmlFor="species-filter" style={{ marginRight: '0.5rem' }}>
            Filter by Species:
          </label>
          <select
            id="species-filter"
            value={speciesFilter}
            onChange={(e) => setSpeciesFilter(e.target.value)}
            style={{ padding: '0.5rem', minWidth: '150px' }}
          >
            <option value="all">All Species</option>
            {uniqueSpecies.map(species => (
              <option key={species} value={species}>
                {species}
              </option>
            ))}
          </select>
        </div>

        {/* Module Selection */}
        <div className="module-group">
          <label htmlFor="module-select" style={{ marginRight: '0.5rem' }}>
            Target Module:
          </label>
          <select
            id="module-select"
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            style={{ padding: '0.5rem', minWidth: '200px' }}
            disabled={modules.length === 0}
          >
            {modules.length === 0 ? (
              <option value="">No modules available</option>
            ) : (
              modules.map(module => (
                <option key={module.id} value={module.id}>
                  {module.name}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Difficulty Level */}
        <div className="difficulty-group">
          <label htmlFor="difficulty-select" style={{ marginRight: '0.5rem' }}>
            Difficulty Level:
          </label>
          <select
            id="difficulty-select"
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(Number(e.target.value))}
            style={{ padding: '0.5rem', minWidth: '80px' }}
          >
            {[1, 2, 3, 4, 5].map(level => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        {/* Publish Button */}
        <button
          onClick={handlePublish}
          disabled={loading || selectedIds.size === 0 || !selectedModule}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: selectedIds.size === 0 || !selectedModule ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: selectedIds.size === 0 || !selectedModule ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          {loading ? 'Publishing...' : `Publish Selected (${selectedIds.size})`}
        </button>
      </div>

      {/* Results Count */}
      <div className="results-info" style={{ marginBottom: '1rem' }}>
        <p>
          Showing {filteredAnnotations.length} of {annotations.length} approved annotations
          {selectedIds.size > 0 && ` | ${selectedIds.size} selected`}
        </p>
      </div>

      {/* Annotations Table */}
      {filteredAnnotations.length === 0 ? (
        <div className="no-data">
          <p>No approved annotations available for publishing.</p>
        </div>
      ) : (
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '0.75rem', border: '1px solid #ddd', textAlign: 'left' }}>
                  <input
                    type="checkbox"
                    checked={filteredAnnotations.length > 0 && selectedIds.size === filteredAnnotations.length}
                    onChange={handleToggleAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '0.75rem', border: '1px solid #ddd', textAlign: 'left' }}>Image</th>
                <th style={{ padding: '0.75rem', border: '1px solid #ddd', textAlign: 'left' }}>Spanish Term</th>
                <th style={{ padding: '0.75rem', border: '1px solid #ddd', textAlign: 'left' }}>English Term</th>
                <th style={{ padding: '0.75rem', border: '1px solid #ddd', textAlign: 'left' }}>Type</th>
                <th style={{ padding: '0.75rem', border: '1px solid #ddd', textAlign: 'left' }}>Species</th>
                <th style={{ padding: '0.75rem', border: '1px solid #ddd', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAnnotations.map(annotation => (
                <tr
                  key={annotation.id}
                  style={{
                    backgroundColor: selectedIds.has(annotation.id) ? '#e3f2fd' : 'white'
                  }}
                >
                  <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(annotation.id)}
                      onChange={() => handleToggleSelection(annotation.id)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>
                    <img
                      src={annotation.imageUrl}
                      alt={annotation.spanishTerm}
                      style={{
                        width: '80px',
                        height: '60px',
                        objectFit: 'cover',
                        borderRadius: '4px'
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-image.png';
                      }}
                    />
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>
                    {annotation.spanishTerm}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>
                    {annotation.englishTerm}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#e0e0e0',
                        borderRadius: '4px',
                        fontSize: '0.875rem'
                      }}
                    >
                      {annotation.type}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>
                    {annotation.species}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>
                    <button
                      onClick={() => setPreviewAnnotation(annotation)}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#1976D2';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#2196F3';
                      }}
                    >
                      👁️ Preview as Student
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview Modal */}
      {previewAnnotation && (
        <AnnotationPreviewModal
          annotation={previewAnnotation}
          onClose={() => setPreviewAnnotation(null)}
        />
      )}
    </div>
  );
};

export default AnnotationPublishingPanel;
