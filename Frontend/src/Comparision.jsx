import React from 'react';
import "./Comparision.css" 

function Comparison({ comparisonData, onClearComparison }) {
  if (!comparisonData || comparisonData.length === 0) {
    return (
      <div className="comparison-container">
        <p>No data available for comparison or no cards selected.</p>
        {onClearComparison && (
            <button onClick={onClearComparison} className="clear-comparison-button">
                Back to Chat
            </button>
        )}
      </div>
    );
  }
  const featureOrder = [
    { key: 'issuer', label: 'Issuer' },
    { key: 'joining_fee', label: 'Joining Fee (INR)' },
    { key: 'annual_fee', label: 'Annual Fee (INR)' },
    { key: 'reward_type', label: 'Reward Type' },
    { key: 'reward_rate', label: 'Reward Rate' },
    { key: 'eligibility_criteria', label: 'Eligibility Criteria' },
    { key: 'spend_benefits', label: 'Spend Benefits' },
    { key: 'special_perks', label: 'Special Perks' },
    { key: 'credit_score_required', label: 'Credit Score Required' },
    { key: 'apply_link', label: 'Apply Link' }, 
  ];

  return (
    <div className="comparison-container">
      <h3>Credit Card Comparison</h3>
      {onClearComparison && (
        <button onClick={onClearComparison} className="clear-comparison-button back-to-chat-button">
          Back to Chat / Clear Comparison
        </button>
      )}
      <div className="comparison-table-wrapper">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Feature</th>
              {comparisonData.map((card) => (
                <th key={card.card_name}>{card.card_name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {featureOrder.map(({ key, label }) => (
              <tr key={key}>
                <td><b>{label}</b></td>
                {comparisonData.map((card) => (
                  <td key={`${card.card_name}-${key}`}>
                    {key === 'apply_link' && card[key] ? (
                      <a href={card[key].startsWith('http') ? card[key] : `https://${card[key]}`} target="_blank" rel="noopener noreferrer">
                        Apply Here
                      </a>
                    ) : (
                      card[key] !== null && card[key] !== undefined ? String(card[key]) : '-'
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Comparison;