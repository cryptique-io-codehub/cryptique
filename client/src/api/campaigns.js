// Function to fetch detailed campaign metrics
export const fetchCampaignMetrics = async (campaignId) => {
  try {
    const response = await fetch(`/api/campaigns/${campaignId}/metrics`);
    if (!response.ok) {
      throw new Error('Failed to fetch campaign metrics');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching campaign metrics:', error);
    throw error;
  }
}; 