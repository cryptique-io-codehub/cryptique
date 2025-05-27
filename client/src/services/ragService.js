import axiosInstance from '../axiosInstance';

const RAG_API_BASE_URL = process.env.REACT_APP_RAG_API_URL || 'http://localhost:8000';

class RAGService {
    constructor() {
        this.axios = axiosInstance;
        this.axios.defaults.baseURL = RAG_API_BASE_URL;
    }

    // Process analytics data
    async processAnalytics(analyticsData) {
        try {
            const response = await this.axios.post('/process/analytics', {
                analytics_data: analyticsData
            });
            return response.data;
        } catch (error) {
            console.error('Error processing analytics:', error);
            throw error;
        }
    }

    // Process contract data
    async processContract(contractData, transactions) {
        try {
            const response = await this.axios.post('/process/contract', {
                contract_data: contractData,
                transactions: transactions
            });
            return response.data;
        } catch (error) {
            console.error('Error processing contract:', error);
            throw error;
        }
    }

    // Process campaign data
    async processCampaign(campaignData) {
        try {
            const response = await this.axios.post('/process/campaign', {
                campaign_data: campaignData
            });
            return response.data;
        } catch (error) {
            console.error('Error processing campaign:', error);
            throw error;
        }
    }

    // Query the RAG system
    async query(question, selectedSites = [], selectedContracts = [], timePeriod = 'all') {
        try {
            const response = await this.axios.post('/query', {
                query: question,
                selected_sites: selectedSites,
                selected_contracts: selectedContracts,
                time_period: timePeriod
            });
            return response.data;
        } catch (error) {
            console.error('Error querying RAG:', error);
            throw error;
        }
    }

    // Get insights
    async getInsights(selectedSites = [], selectedContracts = [], timePeriod = 'all') {
        try {
            const response = await this.axios.post('/insights', {
                selected_sites: selectedSites,
                selected_contracts: selectedContracts,
                time_period: timePeriod
            });
            return response.data;
        } catch (error) {
            console.error('Error getting insights:', error);
            throw error;
        }
    }

    // Get vector store stats
    async getStats() {
        try {
            const response = await this.axios.get('/stats');
            return response.data;
        } catch (error) {
            console.error('Error getting stats:', error);
            throw error;
        }
    }

    // Delete vectors
    async deleteVectors(websiteId = null, contractId = null, olderThan = null) {
        try {
            const params = new URLSearchParams();
            if (websiteId) params.append('website_id', websiteId);
            if (contractId) params.append('contract_id', contractId);
            if (olderThan) params.append('older_than', olderThan);

            const response = await this.axios.delete(`/vectors?${params.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting vectors:', error);
            throw error;
        }
    }
}

export default new RAGService(); 