import React, { useState } from "react";
import { Button, Card, CardContent, CardActions, Chip, Typography, Grid, Paper, Divider, Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { Check, Close } from '@mui/icons-material';
import { useNavigate } from "react-router-dom";

const plans = [
  {
    id: "website",
    name: "Website",
    price: 49,
    annualPrice: 470,
    description: "Off-chain analytics and limited features",
    mostPopular: false,
    features: [
      "1 seat",
      "No priority support",
      "Web analytics",
      "Campaigns",
      "Up to 1 on-chain conversion",
      "Up to 5 off-chain conversions",
      "No on-chain explorer",
      "No segmentation",
      "No filters",
      "2 blockchains",
      "Token analytics",
      "No data import",
      "No data export",
      "No Twitter->Wallet matching",
      "No key account manager",
      "No custom integrations",
      "No custom dashboards",
      "No API",
      "No bot detection"
    ]
  },
  {
    id: "basic",
    name: "Basic",
    price: 249,
    annualPrice: 2390,
    description: "On-chain explorer, higher limits and collaboration tools",
    mostPopular: false,
    features: [
      "3 seats",
      "No priority support",
      "Web analytics",
      "Campaigns",
      "Up to 5 on-chain conversions",
      "Up to 10 off-chain conversions",
      "On-chain explorer",
      "Segmentation",
      "Filters",
      "2 blockchains",
      "Token analytics",
      "Data import up to 100,000 wallets",
      "Data export up to 5,000 wallets",
      "No Twitter->Wallet matching",
      "Key account manager",
      "No custom integrations",
      "No custom dashboards",
      "No API",
      "No bot detection"
    ]
  },
  {
    id: "growth",
    name: "Growth",
    price: 599,
    annualPrice: 5750,
    description: "Unlimited features, highest limits and priority support",
    mostPopular: true,
    features: [
      "10 seats",
      "Priority support",
      "Web analytics",
      "Campaigns",
      "Unlimited on-chain conversions",
      "Unlimited off-chain conversions",
      "On-chain explorer",
      "Segmentation",
      "Filters",
      "All supported blockchains",
      "Token analytics",
      "Data import up to 1,000,000 wallets",
      "Data export up to 100,000 wallets",
      "Twitter->Wallet matching up to 10,000 accounts",
      "Key account manager",
      "No custom integrations",
      "No custom dashboards",
      "No API",
      "No bot detection"
    ]
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    annualPrice: null,
    description: "Custom seats, custom features, on-demand access to exclusive endpoints",
    mostPopular: false,
    features: [
      "Custom seats",
      "Priority support",
      "Web analytics",
      "Campaigns",
      "Unlimited on-chain conversions",
      "Unlimited off-chain conversions",
      "On-chain explorer",
      "Segmentation",
      "Filters",
      "All supported blockchains",
      "Token analytics",
      "Unlimited data import",
      "Unlimited data export",
      "Unlimited Twitter->Wallet matching",
      "Key account manager",
      "Custom integrations",
      "Custom dashboards",
      "Enterprise API",
      "Bot detection & airdrop reports"
    ]
  }
];

const addOns = [
  {
    name: "KOL Intelligence",
    description: "Powerful KOL analytics and insights",
    price: 299,
    comingSoon: false
  },
  {
    name: "KOL Intelligence Pro",
    description: "Match-making, campaigns and more",
    price: null,
    comingSoon: true
  }
];

const comparisonRows = [
  { label: "Seats", values: ["1", "3 seats", "10 seats", "Custom seats"] },
  { label: "Priority Support", values: [false, false, true, true] },
  { label: "Web analytics", values: [true, true, true, true] },
  { label: "Campaigns", values: [true, true, true, true] },
  { label: "On-chain Conversions", values: ["Up to 1", "Up to 5", "Unlimited", "Unlimited"] },
  { label: "Off-chain Conversions", values: ["Up to 5", "Up to 10", "Unlimited", "Unlimited"] },
  { label: "On-chain Explorer", values: [false, true, true, true] },
  { label: "Audiences (Segmentation)", values: [false, true, true, true] },
  { label: "Filters", values: [false, true, true, true] },
  { label: "Blockchains", values: ["2 blockchains", "2 blockchains", "All supported blockchains", "All supported blockchains"] },
  { label: "Token Analytics", values: [true, true, true, true] },
  { label: "Data Import", values: [false, "Up to 100,000 wallets", "Up to 1,000,000 wallets", "Unlimited wallets"] },
  { label: "Data Export", values: [false, "Up to 5,000 enriched wallets", "Up to 100,000 enriched wallets", "Unlimited enriched wallets"] },
  { label: "Advertise - Twitter->Wallet Matching", values: [false, false, "Up to 10,000 accounts", "Unlimited accounts"] },
  { label: "Key Account Manager Support", values: [false, true, true, true] },
  { label: "Custom integrations", values: [false, false, false, true] },
  { label: "Custom dashboards", values: [false, false, false, true] },
  { label: "Enterprise API", values: [false, false, false, true] },
  { label: "Bot Detection & Airdrop Reports", values: [false, false, false, true] }
];

const faqs = [
  {
    q: "How do I subscribe to a plan?",
    a: "Sign in to your account, go to Billing, and select your desired plan."
  },
  {
    q: "Can I upgrade or downgrade later?",
    a: "Yes, you can change your plan at any time from the Billing page."
  },
  {
    q: "How does the CQ Intelligence add-on work?",
    a: "CQ Intelligence is an optional add-on that can be enabled for any plan from the Billing page."
  },
  {
    q: "What if I need a custom plan?",
    a: "Contact us for Enterprise solutions tailored to your needs."
  }
];

const Pricing = () => {
  const [billingCycle, setBillingCycle] = useState("yearly");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white pb-16">
      {/* Header */}
      <div className="max-w-4xl mx-auto pt-10 pb-4 px-4">
        <Typography variant="h5" color="primary" className="font-semibold mb-1">Pricing</Typography>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Start growing with Cookie3</h1>
        <div className="text-gray-500 mb-4 text-sm">If you prefer payments in crypto, please contact us via <Button size="small" variant="outlined" sx={{textTransform:'none', fontSize:'0.8rem', ml:1, mr:1}}>Telegram</Button> or <Button size="small" variant="outlined" sx={{textTransform:'none', fontSize:'0.8rem'}}>Email</Button></div>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="max-w-4xl mx-auto flex items-center gap-4 px-4 mb-6">
        <ToggleButtonGroup
          value={billingCycle}
          exclusive
          onChange={(_, v) => v && setBillingCycle(v)}
          sx={{ background: '#f5f6fa', borderRadius: 2 }}
        >
          <ToggleButton value="yearly" sx={{ fontWeight: 600, px: 3 }}>
            Yearly <Chip label="Get 20% off" color="success" size="small" sx={{ ml: 1, fontWeight: 700 }} />
          </ToggleButton>
          <ToggleButton value="monthly" sx={{ fontWeight: 600, px: 3 }}>
            Monthly
          </ToggleButton>
        </ToggleButtonGroup>
      </div>

      {/* Plans */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 px-4 mb-8">
        {plans.map((plan, idx) => (
          <Card key={plan.id} variant="outlined" sx={{ borderColor: plan.mostPopular ? 'primary.main' : undefined, borderWidth: plan.mostPopular ? 2 : 1, position: 'relative', minHeight: 320 }}>
            {plan.mostPopular && (
              <Chip label="Most popular" color="primary" size="small" sx={{ position: 'absolute', top: 16, right: 16, fontWeight: 700 }} />
            )}
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" className="mb-1">{plan.name}</Typography>
              <Typography variant="h4" color="primary" className="mb-2">
                {plan.price !== null ? (
                  billingCycle === "yearly"
                    ? `$${plan.annualPrice}/yr`
                    : `$${plan.price}/mo`
                ) : (
                  <span>Custom</span>
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary" className="mb-2 min-h-[48px]">{plan.description}</Typography>
            </CardContent>
            <CardActions sx={{ px: 2, pb: 2 }}>
              {plan.id === "enterprise" ? (
                <Button variant="outlined" color="primary" fullWidth onClick={() => window.location = 'mailto:support@yourdomain.com'}>Contact Us</Button>
              ) : (
                <Button variant="contained" color="primary" fullWidth onClick={() => navigate('/settings/billing')}>Select Plan</Button>
              )}
            </CardActions>
          </Card>
        ))}
      </div>

      {/* Add-ons */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 px-4 mb-10">
        {addOns.map((addon, idx) => (
          <Card key={addon.name} variant="outlined" sx={{ opacity: addon.comingSoon ? 0.5 : 1, position: 'relative' }}>
            {addon.comingSoon && (
              <Chip label="Coming soon" color="default" size="small" sx={{ position: 'absolute', top: 16, right: 16 }} />
            )}
            <CardContent>
              <Typography variant="subtitle1" className="mb-1">{addon.name}</Typography>
              <Typography variant="body2" color="text.secondary" className="mb-2">{addon.description}</Typography>
              {addon.price && <Typography variant="h6" color="primary">${addon.price}/mo</Typography>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* What's Included / Comparison Table */}
      <div className="max-w-6xl mx-auto px-4">
        <Typography variant="h6" className="mb-4 font-bold">Choose the plan that fits your needs</Typography>
        <div className="overflow-x-auto bg-white rounded-lg shadow border">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="w-48"></th>
                {plans.map((plan, idx) => (
                  <th key={plan.id} className="text-center py-3 px-2 font-semibold">
                    <div className="mb-2">
                      <Button variant={plan.id === 'enterprise' ? 'outlined' : 'contained'} color="primary" size="small" onClick={() => plan.id === 'enterprise' ? window.location = 'mailto:support@yourdomain.com' : navigate('/settings/billing')}>
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
                  <td className="py-2 px-3 font-medium text-gray-700 whitespace-nowrap">{row.label}</td>
                  {row.values.map((val, idx) => (
                    <td key={idx} className="text-center">
                      {val === true && <Check color="success" fontSize="small" />}
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

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto mt-16 px-4">
        <h2 className="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
        <div className="space-y-6">
          {faqs.map((faq, i) => (
            <Paper key={i} className="p-4" elevation={1}>
              <div className="font-semibold text-gray-800 mb-1">{faq.q}</div>
              <div className="text-gray-600 text-sm">{faq.a}</div>
            </Paper>
          ))}
        </div>
      </div>

      {/* Note */}
      <div className="text-center text-xs text-gray-400 mt-12">
        You must sign in and go to Billing to actually subscribe or manage your plan.
      </div>
    </div>
  );
};

export default Pricing; 