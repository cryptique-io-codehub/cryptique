const Analytics = require("../models/analytics");

// Controller to handle posting the countryName
exports.postCountryName = async (req, res) => {
    try {
        const { payload } = req.body;
        // const newAnalytics = new Analytics({
        //     countryName,
        // });
        // await newAnalytics.save();
        console.log(`Received countryName: ${payload}`);
        res.status(200).json({ message: "Analytics received successfully", payload });
    } catch (e) {
        res.status(500).json({ message: 'Error while posting analyics name', error: e.message });
    }
};
