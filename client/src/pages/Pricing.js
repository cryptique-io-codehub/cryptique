import React, { useState } from "react";
import { Button, Card, CardContent, CardActions, Chip, Typography, Grid, Paper, Divider, Box, ToggleButton, ToggleButtonGroup, Modal, TextField } from "@mui/material";
import { Check, Close } from '@mui/icons-material';
import { useNavigate } from "react-router-dom";

const plans = [
  {
    id: "offchain",
    name: "Off-chain",
    price: 49,
    annualPrice: 539,
    description: "Off-chain analytics only. 1 website. No extra users.",
    mostPopular: false,
  },
  {
    id: "basic",
    name: "Basic",
    price: 349,
    annualPrice: 3799,
    description: "Full app access. 2 websites, 1 smart contract, 2 team members.",
    mostPopular: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 799,
    annualPrice: 8599,
    description: "Full access, higher limits. 3 websites, 3 smart contracts, 3 team members.",
    mostPopular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    annualPrice: null,
    description: "Custom plan. Tailored for your organization.",
    mostPopular: false,
  }
];

const addOns = [
  {
    name: "CQ Intelligence",
    description: "AI-powered analytics and insights to supercharge your decision making.",
    price: 299,
    annualPrice: 3199,
    futuristic: true
  }
];

const comparisonRows = [
  { label: "Websites", values: ["1", "2", "3", "Custom"] },
  { label: "Smart Contracts", values: ["-", "1", "3", "Custom"] },
  { label: "Explorer API Calls", values: ["-", "40,000/mo", "150,000/mo", "Custom"] },
  { label: "Team Members", values: ["1", "2", "3", "Custom"] },
  { label: "Individual User Journey", values: [false, "Up to 10,000", "Up to 50,000", "Custom"] },
  { label: "Wallet Level Breakdown", values: [false, "Up to 10,000", "Up to 100,000", "Custom"] },
  { label: "Priority Support", values: [false, false, true, true] },
  { label: "Blockchains Supported", values: [false, true, true, true] },
  { label: "Data Export", values: [false, false, true, true] },
  { label: "Custom Events", values: [false, "5", "Unlimited", "Unlimited"] },
  { label: "Campaigns", values: [false, "5", "Unlimited", "Unlimited"] },
  { label: "Off-chain Analytics", values: [true, true, true, true] },
  { label: "On-chain Analytics", values: [false, true, true, true] },
  { label: "Custom Integrations", values: [false, false, false, true] },
  { label: "Custom Dashboards", values: [false, false, false, true] },
  { label: "Enterprise API", values: [false, false, false, true] },
  { label: "Bot Detection & Airdrop Reports", values: [false, false, false, true] },
];

const primaryColor = "#1d0c46";
const accentColor = "#caa968";
const headingFont = 'Montserrat, sans-serif';
const bodyFont = 'Poppins, sans-serif';

const Pricing = () => {
  const [billingCycle, setBillingCycle] = useState("yearly");
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [formSent, setFormSent] = useState(false);
  const navigate = useNavigate();

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setFormSent(true);
    // Here you would send the form to your backend or email service
  };

  return (
    <div className="min-h-screen bg-white pb-16" style={{ fontFamily: bodyFont }}>
      {/* Header */}
      <div className="max-w-4xl mx-auto pt-10 pb-4 px-4">
        <Typography variant="h5" style={{ color: primaryColor, fontWeight: 600, fontFamily: headingFont }} className="mb-1">Pricing</Typography>
        <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ fontFamily: headingFont, color: primaryColor }}>Start growing with Cryptique</h1>
        <div className="text-gray-500 mb-4 text-sm">If you prefer payments in crypto, please contact us via <Button size="small" variant="outlined" sx={{textTransform:'none', fontSize:'0.8rem', ml:1, mr:1, borderColor: accentColor, color: accentColor}} style={{fontFamily: bodyFont}}>Telegram</Button> or <Button size="small" variant="outlined" sx={{textTransform:'none', fontSize:'0.8rem', borderColor: accentColor, color: accentColor}} style={{fontFamily: bodyFont}}>Email</Button></div>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="max-w-4xl mx-auto flex items-center gap-4 px-4 mb-6">
        <ToggleButtonGroup
          value={billingCycle}
          exclusive
          onChange={(_, v) => v && setBillingCycle(v)}
          sx={{ background: '#f5f6fa', borderRadius: 2 }}
        >
          <ToggleButton value="yearly" sx={{ fontWeight: 600, px: 3, fontFamily: headingFont, color: primaryColor }}>
            Yearly <Chip label="Get 20% off" sx={{ ml: 1, fontWeight: 700, background: accentColor, color: primaryColor }} size="small" />
          </ToggleButton>
          <ToggleButton value="monthly" sx={{ fontWeight: 600, px: 3, fontFamily: headingFont, color: primaryColor }}>
            Monthly
          </ToggleButton>
        </ToggleButtonGroup>
      </div>

      {/* Plans */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 px-4 mb-8">
        {plans.map((plan, idx) => (
          <Card key={plan.id} variant="outlined" sx={{ borderColor: plan.mostPopular ? accentColor : primaryColor, borderWidth: plan.mostPopular ? 2 : 1, position: 'relative', minHeight: 320, boxShadow: plan.mostPopular ? `0 0 16px 0 ${accentColor}33` : undefined }}>
            {plan.mostPopular && (
              <Chip label="Most popular" sx={{ position: 'absolute', top: 16, right: 16, fontWeight: 700, background: accentColor, color: primaryColor, fontFamily: headingFont }} size="small" />
            )}
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" className="mb-1" style={{ fontFamily: headingFont }}>{plan.name}</Typography>
              <Typography variant="h4" style={{ color: primaryColor, fontFamily: headingFont }} className="mb-2">
                {plan.price !== null ? (
                  billingCycle === "yearly"
                    ? `$${plan.annualPrice}/yr`
                    : `$${plan.price}/mo`
                ) : (
                  <span>Custom</span>
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary" className="mb-2 min-h-[48px]" style={{ fontFamily: bodyFont }}>{plan.description}</Typography>
            </CardContent>
            <CardActions sx={{ px: 2, pb: 2 }}>
              {plan.id === "enterprise" ? (
                <Button variant="outlined" style={{ borderColor: accentColor, color: accentColor, fontFamily: headingFont }} fullWidth onClick={() => setOpenModal(true)}>Contact Us</Button>
              ) : (
                <Button variant="contained" style={{ background: accentColor, color: primaryColor, fontFamily: headingFont }} fullWidth onClick={() => navigate('/settings/billing')}>Select Plan</Button>
              )}
            </CardActions>
          </Card>
        ))}
      </div>

      {/* Add-ons */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 px-4 mb-10">
        {addOns.map((addon, idx) => (
          <Card key={addon.name} variant="outlined" sx={{ position: 'relative', background: 'linear-gradient(90deg, #1d0c46 0%, #caa968 100%)', color: '#fff', boxShadow: '0 0 32px 0 #caa96855', border: 'none', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, background: 'radial-gradient(circle, #caa96855 0%, transparent 70%)', zIndex: 0 }} />
            <CardContent sx={{ position: 'relative', zIndex: 1 }}>
              <Typography variant="subtitle1" className="mb-1" style={{ fontFamily: headingFont, color: accentColor, letterSpacing: 1 }}>CQ Intelligence</Typography>
              <Typography variant="h5" className="mb-2" style={{ fontFamily: headingFont, color: '#fff', textShadow: '0 2px 8px #1d0c46' }}>
                {billingCycle === "yearly" ? `$${addon.annualPrice}/yr` : `$${addon.price}/mo`}
              </Typography>
              <Typography variant="body2" className="mb-2" style={{ fontFamily: bodyFont, color: '#fff', opacity: 0.95 }}>{addon.description}</Typography>
              <Divider sx={{ my: 2, borderColor: accentColor, opacity: 0.5 }} />
              <ul className="mb-2 space-y-2">
                <li className="flex items-center text-sm" style={{ fontFamily: bodyFont }}>
                  <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: accentColor, boxShadow: '0 0 8px #caa968' }}></span>
                  AI-powered analytics
                </li>
                <li className="flex items-center text-sm" style={{ fontFamily: bodyFont }}>
                  <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: accentColor, boxShadow: '0 0 8px #caa968' }}></span>
                  Predictive insights
                </li>
                <li className="flex items-center text-sm" style={{ fontFamily: bodyFont }}>
                  <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: accentColor, boxShadow: '0 0 8px #caa968' }}></span>
                  Automated reporting
                </li>
              </ul>
              <div className="text-xs mt-2" style={{ color: accentColor, fontFamily: bodyFont, opacity: 0.9 }}>Add-on. Enable from Billing after subscribing to a plan.</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* What's Included / Comparison Table */}
      <div className="max-w-6xl mx-auto px-4">
        <Typography variant="h6" className="mb-4 font-bold" style={{ fontFamily: headingFont, color: primaryColor }}>Choose the plan that fits your needs</Typography>
        <div className="overflow-x-auto bg-white rounded-lg shadow border">
          <table className="min-w-full text-sm" style={{ fontFamily: bodyFont }}>
            <thead>
              <tr className="bg-gray-50">
                <th className="w-48"></th>
                {plans.map((plan, idx) => (
                  <th key={plan.id} className="text-center py-3 px-2 font-semibold" style={{ color: primaryColor, fontFamily: headingFont }}>
                    <div className="mb-2">
                      <Button variant={plan.id === 'enterprise' ? 'outlined' : 'contained'} style={plan.id === 'enterprise' ? { borderColor: accentColor, color: accentColor, fontFamily: headingFont } : { background: accentColor, color: primaryColor, fontFamily: headingFont }} size="small" onClick={() => plan.id === 'enterprise' ? setOpenModal(true) : navigate('/settings/billing')}>
                        {plan.id === 'enterprise' ? 'Contact Us' : 'Select Plan'}
                      </Button>
                    </div>
                    <div className="font-bold text-base">{plan.name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, i) => (
                <tr key={row.label} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-2 px-3 font-medium text-gray-700 whitespace-nowrap" style={{ fontFamily: headingFont }}>{row.label}</td>
                  {row.values.map((val, idx) => (
                    <td key={idx} className="text-center">
                      {val === true && <Check sx={{ color: accentColor }} fontSize="small" />}
                      {val === false && <Close color="disabled" fontSize="small" />}
                      {typeof val === 'string' && <span>{val}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enterprise Modal */}
      <Modal open={openModal} onClose={() => { setOpenModal(false); setFormSent(false); }}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', bgcolor: 'white', boxShadow: 24, p: 4, borderRadius: 2, minWidth: 340, maxWidth: 400 }}>
          {formSent ? (
            <div className="text-center">
              <Typography variant="h6" style={{ color: primaryColor, fontFamily: headingFont }}>Thank you!</Typography>
              <Typography variant="body2" style={{ fontFamily: bodyFont }}>We have received your request. Our team will contact you soon.</Typography>
              <Button sx={{ mt: 2 }} variant="contained" style={{ background: accentColor, color: primaryColor, fontFamily: headingFont }} onClick={() => { setOpenModal(false); setFormSent(false); }}>Close</Button>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit}>
              <Typography variant="h6" style={{ color: primaryColor, fontFamily: headingFont }} className="mb-2">Request a Custom Plan</Typography>
              <TextField label="Name" name="name" value={form.name} onChange={handleFormChange} fullWidth required sx={{ mb: 2 }} />
              <TextField label="Email" name="email" value={form.email} onChange={handleFormChange} fullWidth required sx={{ mb: 2 }} />
              <TextField label="Message" name="message" value={form.message} onChange={handleFormChange} fullWidth required multiline rows={3} sx={{ mb: 2 }} />
              <Button type="submit" variant="contained" style={{ background: accentColor, color: primaryColor, fontFamily: headingFont }} fullWidth>Submit</Button>
            </form>
          )}
        </Box>
      </Modal>
    </div>
  );
};

export default Pricing; 