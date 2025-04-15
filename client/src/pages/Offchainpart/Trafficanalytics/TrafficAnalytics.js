const handleSelectWebsite = async () => {
  const idt = localStorage.getItem("idy");
  if (idt) {
    setverifyload(true);
    try {
      const new_response = await axiosInstance.get(`/sdk/analytics/${idt}`);
      if (new_response.data && new_response.data.analytics) {
        setanalytics(new_response.data.analytics);
        // Initialize chart data if not already set
        if (!chartData) {
          setChartData({
            labels: [],
            datasets: [
              {
                label: 'Visitors',
                data: [],
                backgroundColor: 'rgba(252, 211, 77, 0.5)',
                borderColor: '#fcd34d',
                borderWidth: 1
              },
              {
                label: 'Wallets',
                data: [],
                backgroundColor: 'rgba(139, 92, 246, 0.7)',
                borderColor: '#8b5cf6',
                borderWidth: 1
              }
            ]
          });
        }
      } else {
        setError('No analytics data found for this website. Please verify the website first.');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to load analytics data');
    } finally {
      setverifyload(false);
    }
  }
} 