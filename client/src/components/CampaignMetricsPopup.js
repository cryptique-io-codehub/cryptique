import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';
import { formatNumber, formatCurrency, formatDuration } from '../utils/formatters.js';

const CampaignMetricsPopup = ({ isOpen, onClose, metrics, campaign }) => {
  if (!metrics) return null;

  const { transactionActivity, contractPerformance, userJourney, campaignPerformance } = metrics;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex justify-between items-center mb-6">
                  <Dialog.Title className="text-2xl font-semibold text-gray-900">
                    {campaign.name} - Campaign Analytics
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Overall Performance */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500">Total Value</h3>
                    <p className="text-2xl font-semibold text-gray-900">{formatCurrency(campaignPerformance.totalValue)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500">ROI</h3>
                    <p className="text-2xl font-semibold text-gray-900">{formatNumber(campaignPerformance.roi)}%</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500">CAC</h3>
                    <p className="text-2xl font-semibold text-gray-900">{formatCurrency(campaignPerformance.cac)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500">Conversion Rate</h3>
                    <p className="text-2xl font-semibold text-gray-900">{formatNumber(userJourney.funnel.overallConversionRate)}%</p>
                  </div>
                </div>

                {/* User Journey Funnel */}
                <div className="mb-8">
                  <h2 className="text-lg font-semibold mb-4">User Journey</h2>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="relative">
                      <div className="bg-indigo-100 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-500">Total Visitors</h3>
                        <p className="text-xl font-semibold">{userJourney.funnel.totalVisitors}</p>
                      </div>
                      <div className="absolute -right-2 top-1/2 transform -translate-y-1/2">
                        <div className="bg-indigo-500 text-white text-xs px-2 py-1 rounded">
                          {formatNumber(userJourney.funnel.web3Rate)}%
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="bg-indigo-100 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-500">Web3 Users</h3>
                        <p className="text-xl font-semibold">{userJourney.funnel.web3Visitors}</p>
                      </div>
                      <div className="absolute -right-2 top-1/2 transform -translate-y-1/2">
                        <div className="bg-indigo-500 text-white text-xs px-2 py-1 rounded">
                          {formatNumber(userJourney.funnel.walletRate)}%
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="bg-indigo-100 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-500">Wallet Connections</h3>
                        <p className="text-xl font-semibold">{userJourney.funnel.walletConnections}</p>
                      </div>
                      <div className="absolute -right-2 top-1/2 transform -translate-y-1/2">
                        <div className="bg-indigo-500 text-white text-xs px-2 py-1 rounded">
                          {formatNumber(userJourney.funnel.transactionRate)}%
                        </div>
                      </div>
                    </div>
                    <div className="bg-indigo-100 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-500">Transactors</h3>
                      <p className="text-xl font-semibold">{userJourney.funnel.transactors}</p>
                    </div>
                  </div>
                </div>

                {/* Transaction Activity Chart */}
                <div className="mb-8">
                  <h2 className="text-lg font-semibold mb-4">Transaction Activity</h2>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={transactionActivity}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Area yAxisId="left" type="monotone" dataKey="transactions" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.1} />
                        <Area yAxisId="right" type="monotone" dataKey="volume" stroke="#10B981" fill="#10B981" fillOpacity={0.1} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Contract Performance */}
                <div className="mb-8">
                  <h2 className="text-lg font-semibold mb-4">Contract Performance</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contract</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volume</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unique Users</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversions</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Value</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {contractPerformance.map((contract, idx) => (
                          <tr key={contract.address} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{contract.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contract.transactions}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(contract.volume)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contract.uniqueUsers}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contract.conversions}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatNumber(contract.successRate)}%</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(contract.averageValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Engagement Metrics */}
                <div>
                  <h2 className="text-lg font-semibold mb-4">Engagement Metrics</h2>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h3 className="text-sm font-medium text-gray-500">Avg Session Duration</h3>
                      <p className="text-xl font-semibold">{formatDuration(userJourney.engagement.avgSessionDuration)}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h3 className="text-sm font-medium text-gray-500">Bounce Rate</h3>
                      <p className="text-xl font-semibold">{formatNumber(userJourney.engagement.bounceRate)}%</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h3 className="text-sm font-medium text-gray-500">Repeat Rate</h3>
                      <p className="text-xl font-semibold">{formatNumber(userJourney.engagement.repeatRate)}%</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h3 className="text-sm font-medium text-gray-500">Time to Transaction</h3>
                      <p className="text-xl font-semibold">{formatDuration(userJourney.engagement.avgTimeToTransaction)}</p>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default CampaignMetricsPopup; 