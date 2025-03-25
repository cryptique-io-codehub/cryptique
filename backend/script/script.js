fetch('https://ipapi.co/json/')
  .then(response => response.json())
  .then(data => {
    console.log('Country:', data.country_name);  
    window.country = data.country_name;          

    // Send the country name to your backend API
    fetch('https://cryptique-backend.vercel.app/api/sdk/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ countryName: data.country_name })
    })
    .then(res => res.json())
    .then(result => console.log('API Response:', result))
    .catch(error => console.error('Error posting country:', error));

  })
  .catch(error => console.error('Error fetching country:', error));