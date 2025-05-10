import React, { useState } from "react";
import { Button, Card, CardContent, CardActions, Chip, Typography, Grid, Paper, Divider } from "@mui/material";
import { useNavigate } from "react-router-dom";

const plans = [
  {
    id: "offchain",
    name: "Off-chain",
    price: 49,
    annualPrice: 539,
    features: [
      "Off-chain analytics only",
      "Link 1 website",
      "No additional team members"
    ],
    description: "For individuals or small teams who only need off-chain analytics.",
    cta: "Get Started"
  },
  {
    id: "basic",
    name: "Basic",
    price: 249,
    annualPrice: 3799,
    features: [
      "Full app access",
      "Link up to 2 websites",
      "Link 1 smart contract",
      "40,000 monthly explorer API calls",
      "2 team members"
    ],
    description: "For growing teams who need more power and collaboration.",
    cta: "Start Basic"
  },
  {
    id: "pro",
    name: "Pro",
    price: 799,
    annualPrice: 8599,
    features: [
      "Full app access",
      "Link up to 3 websites",
      "Link up to 3 smart contracts",
      "150,000 monthly explorer API calls",
      "3 team members"
    ],
    description: "For power users and teams who need the highest limits.",
    cta: "Start Pro",
    popular: true
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    annualPrice: null,
    features: [
      "Custom solution",
      "Unlimited websites",
      "Unlimited smart contracts",
      "Unlimited API calls",
      "Unlimited team members",
      "Dedicated support"
    ],
    description: "For organizations with custom needs. Get in touch for a tailored solution.",
    cta: "Contact Us"
  }
];

const cqIntelligence = {
  name: "CQ Intelligence (Add-on)",
  price: 299,
  annualPrice: 3199,
  features: [
    "Advanced AI analytics",
    "Predictive insights",
    "Automated reporting"
  ],
  description: "AI-powered analytics and insights to supercharge your decision making."
};

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
  const [billingCycle, setBillingCycle] = useState("monthly");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Hero Section */}
      <div className="text-center py-12 bg-white border-b">
        <h1 className="text-4xl font-bold mb-2">Choose the plan that fits your team</h1>
        <p className="text-lg text-gray-600 mb-6">Simple, transparent pricing. No hidden fees.</p>
        <div className="inline-flex bg-gray-100 rounded-lg p-1 mb-4">
          <Button
            variant={billingCycle === "monthly" ? "contained" : "text"}
            color="primary"
            onClick={() => setBillingCycle("monthly")}
            sx={{ borderRadius: 2 }}
          >
            Monthly
          </Button>
          <Button
            variant={billingCycle === "annual" ? "contained" : "text"}
            color="primary"
            onClick={() => setBillingCycle("annual")}
            sx={{ borderRadius: 2 }}
          >
            Annual <span className="ml-2 text-green-600 text-xs">Save 10%+</span>
          </Button>
        </div>
        <div className="text-sm text-gray-500">All plans are billed by team. You can upgrade or downgrade anytime.</div>
      </div>

      {/* Plans Grid */}
      <div className="max-w-6xl mx-auto px-4 mt-10">
        <Grid container spacing={4}>
          {plans.map((plan) => (
            <Grid item xs={12} md={6} lg={3} key={plan.id}>
              <Card
                variant="outlined"
                sx={{
                  borderColor: plan.popular ? 'primary.main' : undefined,
                  borderWidth: plan.popular ? 2 : 1,
                  boxShadow: plan.popular ? 4 : 1,
                  position: 'relative',
                  minHeight: 420
                }}
                className={plan.popular ? 'scale-105' : ''}
              >
                {plan.popular && (
                  <Chip label="Most Popular" color="primary" size="small" sx={{ position: 'absolute', top: 16, right: 16 }} />
                )}
                <CardContent>
                  <Typography variant="h6" gutterBottom>{plan.name}</Typography>
                  <Typography variant="h4" color="primary" gutterBottom>
                    {plan.price !== null ? (
                      billingCycle === "monthly"
                        ? `$${plan.price}/mo`
                        : `$${plan.annualPrice}/yr`
                    ) : (
                      <span>Custom</span>
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {plan.description}
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <ul className="mb-4 space-y-2">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center text-sm text-gray-700">
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2 }}>
                  {plan.id === "enterprise" ? (
                    <Button
                      variant="outlined"
                      color="primary"
                      fullWidth
                      onClick={() => window.location = 'mailto:support@yourdomain.com'}
                    >
                      Contact Us
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      onClick={() => navigate('/settings/billing')}
                    >
                      {plan.cta}
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* CQ Intelligence Add-on */}
        <div className="max-w-2xl mx-auto mt-12">
          <Card variant="outlined" sx={{ borderColor: 'secondary.main', borderWidth: 2 }}>
            <CardContent>
              <Typography variant="h6" color="secondary" gutterBottom>
                {cqIntelligence.name}
              </Typography>
              <Typography variant="h5" color="primary" gutterBottom>
                {billingCycle === "monthly" ? `$${cqIntelligence.price}/mo` : `$${cqIntelligence.annualPrice}/yr`}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {cqIntelligence.description}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <ul className="mb-2 space-y-2">
                {cqIntelligence.features.map((f, i) => (
                  <li key={i} className="flex items-center text-sm text-gray-700">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="text-xs text-gray-500 mt-2">Add-on. Enable from Billing after subscribing to a plan.</div>
            </CardContent>
          </Card>
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