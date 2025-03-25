const Analytics = require("../models/analytics");

// Controller to handle posting the countryName
exports.postCountryName = async (req, res) => {
    try {
        const { countryName } = req.body;
        const newAnalytics = new Analytics({
            countryName,
        });
        await newAnalytics.save();
        console.log(`Received countryName: ${countryName}`);
        res.status(200).json({ message: "Country name received successfully", countryName });
    } catch (e) {
        res.status(500).json({ message: 'Error while posting country name', error: e.message });
    }
};
