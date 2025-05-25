import React from 'react';

const SourceSelector = ({ selectedSource, onSourceChange }) => {
    const sources = [
        { id: 'gazzetta', label: 'Gazzetta' },
        { id: 'media24', label: '24 Media' }
    ];

    return (
        <div className="source-selector">
            <h3>Select Data Source</h3>
            <div className="source-options">
                {sources.map((source) => (
                    <div key={source.id} className="source-option">
                        <label className="source-label">
                            <input
                                type="radio"
                                name="data-source"
                                value={source.id}
                                checked={selectedSource === source.id}
                                onChange={() => onSourceChange(source.id)}
                                className="source-input"
                            />
                            <span className="source-text">{source.label}</span>
                        </label>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SourceSelector;
